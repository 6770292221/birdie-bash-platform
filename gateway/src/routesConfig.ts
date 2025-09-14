export interface ProxyRoute {
  path: string;
  target: string;
  protected: boolean;
  adminRequired?: boolean;
  methods?: string[];
}

export function getRoutes(authUrl: string, eventUrl: string, settlementUrl: string): ProxyRoute[] {
  return [
    { path: "/api/auth", target: authUrl, protected: false },
    {
      path: "/api/events",
      target: eventUrl,
      protected: true,
      adminRequired: true,
      methods: ["POST", "PATCH", "DELETE"],
    },
    {
      path: "/api/events",
      target: eventUrl,
      protected: true,
      adminRequired: false,
    },
    {
      path: "/api/settlements",
      target: settlementUrl,
      protected: true,
      adminRequired: false,
    },
  ];
}
