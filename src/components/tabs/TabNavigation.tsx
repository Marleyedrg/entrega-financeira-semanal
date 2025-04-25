
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full bg-white border border-gray-200 p-1">
        <TabsTrigger value="registros" className="flex-1">
          Registros de Entregas
        </TabsTrigger>
        <TabsTrigger value="analise" className="flex-1">
          Análise de Dados
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default TabNavigation;
