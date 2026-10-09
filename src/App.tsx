import { Route, Switch } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { AccountProvider, useAccount } from "@/lib/account";
import { AuthProvider } from "@/lib/auth";
import { AdminPage } from "@/pages/Admin";
import { ComptePage } from "@/pages/Compte";
import { ConversationPage } from "@/pages/Conversation";
import { DashboardPage } from "@/pages/Dashboard";
import { HomePage } from "@/pages/Home";
import { ConfidentialitePage, MentionsLegalesPage } from "@/pages/Legal";
import { LoginPage } from "@/pages/Login";
import { NotFoundPage } from "@/pages/NotFound";
import { ProfilPage } from "@/pages/Profil";

function AppArea() {
  const { info } = useAccount();
  return (
    <AppShell isAdmin={info?.account.is_admin ?? false}>
      <Switch>
        <Route path="/app" component={DashboardPage} />
        <Route path="/app/c/:id">{(params) => <ConversationPage key={params.id} id={params.id} />}</Route>
        <Route path="/app/profil" component={ProfilPage} />
        <Route path="/app/compte" component={ComptePage} />
        <Route component={NotFoundPage} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/mentions-legales" component={MentionsLegalesPage} />
          <Route path="/confidentialite" component={ConfidentialitePage} />
          <Route path="/admin">
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          </Route>
          <Route path="/app/*?">
            <RequireAuth>
              <AppArea />
            </RequireAuth>
          </Route>
          <Route component={NotFoundPage} />
        </Switch>
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </AccountProvider>
    </AuthProvider>
  );
}
