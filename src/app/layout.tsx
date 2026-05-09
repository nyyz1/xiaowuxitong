import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import "./globals.css";
import { appConfig } from "@/lib/app-config";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full">
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#1c716a",
                borderRadius: 8,
                colorBgBase: "#f4f6f1",
                colorBgContainer: "#fffdf8",
                colorBgLayout: "#f4f6f1",
                colorBorder: "rgba(38, 56, 49, 0.16)",
                colorTextBase: "#1c2824",
                fontFamily:
                  '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
              },
              components: {
                Button: {
                  controlHeight: 36,
                  borderRadius: 8,
                },
                Card: {
                  borderRadiusLG: 8,
                  paddingLG: 20,
                },
                Input: {
                  borderRadius: 8,
                  controlHeight: 36,
                },
                Select: {
                  borderRadius: 8,
                  controlHeight: 36,
                },
                Table: {
                  borderColor: "rgba(38, 56, 49, 0.12)",
                  headerBg: "#f4f0e7",
                  rowHoverBg: "#edf6f3",
                },
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
