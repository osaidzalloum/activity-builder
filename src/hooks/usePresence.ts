import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { participantSchema } from "../schemas";
import type { Participant } from "../types";

export default function usePresence(
    code: string | undefined,   
    id: string | undefined,     
    name: string | undefined,   
    role: Participant["role"]
) {
    const [participants, setParticipants] = useState<Participant[]>([]);

    useEffect(() => {
        if (!code || !id || !name) return;
        const channel = supabase.channel(`live:${code}`, {
      config: { presence: { key: id } },
    });
    
    channel
      // 3. كل ما الورقة تتغير (حدا دخل أو طلع)
      .on("presence", { event: "sync" }, () => {
        const all = Object.values(channel.presenceState()).flat();
        // ما نثق بالبيانات: كل طالب هو اللي كتب عن نفسه
        const valid = all.flatMap((entry) => {
          const parsed = participantSchema.safeParse(entry);
          return parsed.success ? [parsed.data] : [];
        });
        setParticipants(valid);
      })
      // 2. لما الاتصال يجهز، اكتب اسمي على الورقة
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ id, name, role });
        }
      });

    // لما الصفحة تتسكر: اطلع من الغرفة
    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, id, name, role]);

  return participants;
}