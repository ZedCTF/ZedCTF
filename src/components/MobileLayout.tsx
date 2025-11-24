// components/MobileLayout.tsx
import { ReactNode } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  return (
    <div className="mobile-layout">
      {/* Mobile-specific styles */}
      <style>{`
        @media (max-width: 768px) {
          /* Prevent zoom on form inputs iOS */
          input, select, textarea {
            font-size: 16px !important;
          }
          
          /* Improve touch targets */
          button, [role="button"] {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Better scrolling */
          body {
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }
          
          /* Force single column on mobile */
          .mobile-grid-fix {
            grid-template-columns: 1fr !important;
          }
          
          /* Better table handling */
          .mobile-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Responsive text scaling */
        @media (max-width: 640px) {
          .mobile-text-lg { font-size: 1.125rem !important; }
          .mobile-text-xl { font-size: 1.25rem !important; }
          .mobile-text-2xl { font-size: 1.5rem !important; }
          .mobile-text-3xl { font-size: 1.875rem !important; }
          .mobile-text-4xl { font-size: 2.25rem !important; }
        }
      `}</style>
      
      {/* Main content wrapper */}
      <div className="min-h-screen bg-background overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;