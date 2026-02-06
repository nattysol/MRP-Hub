import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    // 'animate-slideUp' adds a subtle upward drift for that premium feel
    <div className="flex-1 flex flex-col h-full animate-slideUp">
      {children}
    </div>
  );
};

export default PageTransition;