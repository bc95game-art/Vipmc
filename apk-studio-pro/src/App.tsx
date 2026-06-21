import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import ApkStudio from "@/pages/apk-studio";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={ApkStudio} />
        <Route>
          <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-gray-400 text-sm">
            404 — صفحه یافت نشد
          </div>
        </Route>
      </Switch>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#252526",
            border: "1px solid #3d3d3d",
            color: "#d4d4d4",
            fontSize: "13px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
