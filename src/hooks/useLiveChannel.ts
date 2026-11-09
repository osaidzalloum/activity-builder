import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getStudentClient } from "../lib/studentSupabase";
import { participantSchema } from "../schemas";
import type { Participant } from "../types";

type BroadcastHandler = (event: string, payload: unknown) => void;
type Channels = { live: RealtimeChannel; answers: RealtimeChannel };

// One sign-in at a time per client: React can start the same effect twice at once (in development),
// and two sign-ins would create two anonymous users and spend two of the hourly sign-ups.
const signingIn = new WeakMap<SupabaseClient, Promise<void>>();

// A student has no account: sign them in anonymously, once per tab.
function signInAnonymouslyIfNeeded(client: SupabaseClient): Promise<void> {
  const running = signingIn.get(client);
  if (running) return running;

  const attempt = (async () => {
    const { data } = await client.auth.getSession();
    if (data.session) return;
    const { error } = await client.auth.signInAnonymously();
    if (error) throw error;
  })().finally(() => signingIn.delete(client));

  signingIn.set(client, attempt);
  return attempt;
}

// A live session uses two private channels, so the database can tell the roles apart by channel:
//   live:CODE     the host sends questions, reveals and the end; everyone sees who is connected
//   answers:CODE  students send their answers; the host is the one who listens
// The teacher uses the normal client. A student uses a separate one with an anonymous identity.
export default function useLiveChannel(
  code: string | undefined,
  id: string | undefined,
  name: string | undefined,
  role: Participant["role"],
  onBroadcast?: BroadcastHandler
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  // true while a channel cannot be joined (not signed in, or the database refuses it)
  const [failed, setFailed] = useState(false);
  const channelsRef = useRef<Channels | null>(null);
  const handlerRef = useRef(onBroadcast);

  // keep the latest handler without resubscribing to the channels
  useEffect(() => {
    handlerRef.current = onBroadcast;
  }, [onBroadcast]);

  useEffect(() => {
    if (!code || !id || !name) return;

    const client = role === "host" ? supabase : getStudentClient();
    let cancelled = false;
    let channels: Channels | null = null;

    async function connect() {
      try {
        if (role !== "host") await signInAnonymouslyIfNeeded(client);
        // private channels check the user's token, so hand it to Realtime before joining
        await client.realtime.setAuth();
      } catch (error) {
        console.error(error);
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) return;

      const live = client.channel(`live:${code}`, {
        config: {
          private: true,
          presence: { key: id },
          // wait for the server to confirm each broadcast, so send() really means "delivered"
          broadcast: { ack: true },
        },
      });
      const answers = client.channel(`answers:${code}`, {
        config: { private: true, broadcast: { ack: true } },
      });
      channels = { live, answers };
      channelsRef.current = channels;

      const broken = { live: false, answers: false };
      const report = (which: keyof typeof broken, status: string, reason?: Error) => {
        if (status === "SUBSCRIBED") {
          broken[which] = false;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // the reason (for example a policy that refuses the channel) is only given here
          console.error(`${which} channel: ${status}`, reason);
          broken[which] = true;
        } else {
          return;
        }
        setFailed(broken.live || broken.answers);
      };

      live.on("presence", { event: "sync" }, () => {
        const all = Object.values(live.presenceState()).flat();
        const valid = all.flatMap((entry) => {
          const parsed = participantSchema.safeParse(entry);
          return parsed.success ? [parsed.data] : [];
        });
        setParticipants(valid);
      });

      // the host hears the answers, a student hears the host
      const listening = role === "host" ? answers : live;
      listening.on("broadcast", { event: "*" }, ({ event, payload }) => {
        handlerRef.current?.(event, payload);
      });

      live.subscribe(async (status, reason) => {
        report("live", status, reason);
        if (status === "SUBSCRIBED") {
          await live.track({ id, name, role });
        }
      });
      answers.subscribe((status, reason) => report("answers", status, reason));
    }

    connect();

    return () => {
      cancelled = true;
      channelsRef.current = null;
      if (channels) {
        client.removeChannel(channels.live);
        client.removeChannel(channels.answers);
      }
    };
  }, [code, id, name, role]);

  const send = useCallback(
    async (event: string, payload: unknown) => {
      const channels = channelsRef.current;
      if (!channels) return false;
      // the host talks on the live channel, a student on the answers channel
      const channel = role === "host" ? channels.live : channels.answers;
      const result = await channel.send({ type: "broadcast", event, payload });
      return result === "ok";
    },
    [role]
  );

  return { participants, send, failed };
}