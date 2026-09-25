import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Provider from "@/lib/Provider";
import ReduxProvider from "@/redux/ReduxProvider";
import InitUser from "@/InitUser";
import Nav from "@/components/Nav";
import "./globals.css";
import "leaflet/dist/leaflet.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MY_RIDE - Smart Vehicle Booking Platform",
  description: "MY_RIDE ek modern multi-vendor vehicle booking platform hai jahan users aasaani se cars, bikes aur commercial vehicles book kar sakte hain. Secure login, verified owners aur transparent pricing ke saath MY_RIDE mobility ko simple aur reliable banata hai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const origError = console.error;
                  console.error = function() {
                    for (var i = 0; i < arguments.length; i++) {
                      var a = arguments[i];
                      if (typeof a === 'string' && a.indexOf('bis_skin_checked') !== -1) {
                        return;
                      }
                      if (a && typeof a.message === 'string' && a.message.indexOf('bis_skin_checked') !== -1) {
                        return;
                      }
                    }
                    return origError.apply(console, arguments);
                  };

                  function cleanBis() {
                    var els = document.querySelectorAll('[bis_skin_checked]');
                    for (var j = 0; j < els.length; j++) {
                      els[j].removeAttribute('bis_skin_checked');
                    }
                  }
                  cleanBis();

                  if (typeof MutationObserver !== 'undefined') {
                    var obs = new MutationObserver(function(muts) {
                      for (var k = 0; k < muts.length; k++) {
                        if (muts[k].attributeName === 'bis_skin_checked' && muts[k].target && muts[k].target.removeAttribute) {
                          muts[k].target.removeAttribute('bis_skin_checked');
                        }
                      }
                    });
                    obs.observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked']
                    });
                  }
                  window.addEventListener('DOMContentLoaded', cleanBis);
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Provider>
          <ReduxProvider>
            <InitUser/>
            <Nav/>
            {children}
          </ReduxProvider>
        </Provider>
        
      </body>
    </html>
  );
}
