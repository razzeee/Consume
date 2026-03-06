import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConsumeStateProvider } from '#/components/ConsumeStateProvider'
import { OptionalConvexProvider } from '#/components/OptionalConvexProvider'
import Footer from '#/components/Footer'
import Header from '#/components/Header'
import WowThemeProvider from '#/components/theme/WowThemeProvider'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <WowThemeProvider>
      <OptionalConvexProvider>
        <ConsumeStateProvider>
          <div className="app-shell">
            <a href="#main-content" className="skip-link">
              Skip to content
            </a>
            <div className="warcraft-atmosphere" aria-hidden="true">
              <span className="atmosphere-ring atmosphere-ring-left" />
              <span className="atmosphere-ring atmosphere-ring-right" />
              <span className="atmosphere-spark" />
            </div>
            <div className="app-frame">
              <Header />
              <Outlet />
              <Footer />
            </div>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'TanStack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          </div>
        </ConsumeStateProvider>
      </OptionalConvexProvider>
    </WowThemeProvider>
  )
}
