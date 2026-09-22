import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { isUiPreviewEnabled } from "../utils/ui-preview.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    uiPreview: isUiPreviewEnabled(),
  };
};

export default function App() {
  const { apiKey, uiPreview } = useLoaderData<typeof loader>();

  if (uiPreview) {
    return (
      <AppProvider embedded={false}>
        <div style={{ padding: "12px 16px", background: "#fff3cd", borderBottom: "1px solid #ffc107", fontSize: 13 }}>
          Staging UI preview (no Shopify login). Remove ALLOW_UI_PREVIEW after Partner access.
        </div>
        <s-app-nav>
          <s-link href="/app">Appointments</s-link>
        </s-app-nav>
        <Outlet />
      </AppProvider>
    );
  }

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        {/* <s-link href="/app">Home</s-link> */}
        <s-link href="/app">Appointments</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
