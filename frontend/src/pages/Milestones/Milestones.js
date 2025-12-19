import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MilestonesGrid from '@/pages/Milestones/MilestonesGrid';

export const Milestones = () => {
  return (
    <div className="space-y-6" data-testid="milestones-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Milestones</h1>
        <p className="text-slate-600 mt-1">Track and manage project milestones</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="w-full">
            <Tabs defaultValue="secondary-sales" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="secondary-sales">Secondary Sales Milestone Tracker</TabsTrigger>
                <TabsTrigger value="site-execution">Site Execution Milestone Tracker</TabsTrigger>
              </TabsList>
              <TabsContent value="secondary-sales" className="mt-0">
                <MilestonesGrid sheetType="secondary-sales" />
              </TabsContent>
              <TabsContent value="site-execution" className="mt-0">
                <MilestonesGrid sheetType="site-execution" />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
