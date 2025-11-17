import { AppLayout } from "@/components/layout/app-layout";
import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <AppLayout>
      <EnhancedChatInterface />
    </AppLayout>
  );
}
