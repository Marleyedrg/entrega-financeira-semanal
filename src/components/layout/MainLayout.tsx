
import React from 'react';

interface MainLayoutProps {
  title: string;
  totalAmount: number;
  children: React.ReactNode;
}

const MainLayout = ({ title, totalAmount, children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="text-xl font-semibold text-green-600">
            Total: R$ {totalAmount.toFixed(2)}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
