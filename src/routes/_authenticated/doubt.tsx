import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/doubt")({
  component: () => <Outlet />,
});

export const useDoubtMatches = useMatches;