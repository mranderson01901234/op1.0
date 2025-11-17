import { AppLayout } from "@/components/layout/app-layout";
import { EditorContainer } from "@/components/editor/editor-container";
import { ProtectedChat } from "@/components/auth/protected-chat";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <AppLayout>
      <ProtectedChat>
        <EditorContainer />
      </ProtectedChat>
    </AppLayout>
  );
}
