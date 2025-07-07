"use client"

import { useState } from "react"
import { UserManagement } from "@/components/settings/user-management"
import { AmazonCredentials } from "@/components/settings/amazon-credentials"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("users")

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="amazon">Amazon Credentials</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="amazon" className="mt-6">
          <AmazonCredentials />
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          <div className="text-muted-foreground">
            Security settings coming soon...
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-6">
          <div className="text-muted-foreground">
            Access logs coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
