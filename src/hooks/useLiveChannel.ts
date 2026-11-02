import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { participantSchema } from "../schemas";
import type { Participant } from "../types";

type BroadcastHandler = (event: string, payload: unknown) => void;

export default function useLiveChannel (
    code: string | undefined,
    id: string | undefined,
    name: string | undefined,
    role: Participant["role"],
    onBroadcast?: BroadcastHandler,
){
    const [participants, setParticipants] = useState<Participant[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const handlerRef = useRef(onBroadcast);


    // keep the latest handler without resubscribing to the channel
    useEffect(() => {
        handlerRef.current = onBroadcast;
    }, [onBroadcast]);

    useEffect(() => {
        if (!code || !id || !name) return;

        const channel = supabase.channel(`live:${code}`, {
            config: { presence: { key: id } },
        });
        channelRef.current = channel;

        channel
        .on("presence", { event: "sync" }, () => {
            const all = Object.values(channel.presenceState()).flat();
            const valid = all.flatMap((evtry) => {
                const parsed = participantSchema.safeParse(evtry);
                return parsed.success ? [parsed.data] : [];
            });
            setParticipants(valid);
        })
        .on("broadcast", { event: "*"}, ({ event, payload }) => {
            handlerRef.current?.(event, payload);
        })
        .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await channel.track({ id, name, role });
            }
        });
        return () => {
            channelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [code, id, name, role]);
    
    const send = useCallback(async (event: string, payload: unknown) => {
        const channel = channelRef.current;
        if (!channel) return false;
        const result = await channel.send({ type: "broadcast", event, payload });
        return result === "ok";
    }, []);

    return { participants, send};
}

