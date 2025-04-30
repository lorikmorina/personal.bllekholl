"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Info, Key, Lock, RefreshCw, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type RequestData = {
  endpoint: string
  method: string
  headers: Record<string, string>
  response: any
  timestamp: string
  authToken?: string
  userInfo?: {
    id?: string
    email?: string
    [key: string]: any
  }
}

export default function SupabaseNetworkMonitor() {
  const [requests, setRequests] = useState<RequestData[]>([])
  const [activeTab, setActiveTab] = useState("requests")
  const [showTokens, setShowTokens] = useState(false)
  const [isLive, setIsLive] = useState(true)
  
  // Function to format JSON for display
  const formatJson = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2)
    } catch (error) {
      return String(json)
    }
  }
  
  // Function to refresh monitoring (in a real implementation, this would restart the monitoring)
  const handleRefresh = () => {
    // This function would be connected to the actual monitoring script
    // For this demo, we'll just toggle isLive state
    setIsLive(prev => !prev)
    setTimeout(() => setIsLive(true), 500)
  }
  
  // Function to clear all captured requests
  const handleClear = () => {
    setRequests([])
  }
  
  // Extract domain from URL
  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch (error) {
      return url
    }
  }
  
  // Function to format timestamp
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    } catch (error) {
      return timestamp
    }
  }
  
  // Helper to mask sensitive values
  const maskSensitiveValue = (value: string): string => {
    if (!value) return ""
    if (value.length < 8) return "****"
    return value.substring(0, 4) + "..." + value.substring(value.length - 4)
  }
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Supabase Network Monitor</CardTitle>
            <CardDescription>
              Captures and analyzes network requests to Supabase endpoints
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isLive ? "default" : "outline"} className="h-6">
              {isLive ? "Monitoring Active" : "Paused"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No requests captured yet</AlertTitle>
            <AlertDescription>
              Refresh the page or interact with the application to capture Supabase requests.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="userInfo">User Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="requests" className="max-h-96 overflow-y-auto mt-4">
              <div className="space-y-4">
                {requests.map((req, idx) => (
                  <Card key={idx} className="relative">
                    <CardHeader className="py-3 px-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {req.method}
                            </Badge>
                            <span className="text-sm font-medium">{getDomain(req.endpoint)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatTime(req.timestamp)}
                          </span>
                        </div>
                        {req.authToken && (
                          <Badge variant="secondary" className="flex items-center">
                            <Key className="h-3 w-3 mr-1" />
                            Auth
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 px-4">
                      <div className="text-xs font-mono bg-muted p-2 rounded max-h-40 overflow-y-auto">
                        <div className="mb-2">
                          <span className="font-semibold">Endpoint:</span> {req.endpoint}
                        </div>
                        {req.authToken && (
                          <div className="mb-2 flex items-center">
                            <span className="font-semibold mr-1">Auth Token:</span>
                            <code className="bg-muted-foreground/10 px-1 rounded">
                              {showTokens ? req.authToken : maskSensitiveValue(req.authToken)}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 ml-1"
                              onClick={() => setShowTokens(!showTokens)}
                            >
                              {showTokens ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                        {req.userInfo && (
                          <div className="mb-2">
                            <span className="font-semibold">User Info:</span>
                            <pre className="text-xs mt-1">{formatJson(req.userInfo)}</pre>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold">Response:</span>
                          <pre className="text-xs mt-1">{formatJson(req.response)}</pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="auth" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Authentication Details</CardTitle>
                  <CardDescription>
                    Analysis of captured authentication tokens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {requests.filter(r => r.authToken).length > 0 ? (
                    <div className="space-y-4">
                      <Alert>
                        <Lock className="h-4 w-4" />
                        <AlertTitle>Authentication Detected</AlertTitle>
                        <AlertDescription>
                          {requests.filter(r => r.authToken).length} request(s) contain authentication tokens
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        {requests
                          .filter(r => r.authToken)
                          .map((req, idx) => (
                            <div key={idx} className="p-2 border rounded">
                              <div className="flex justify-between items-center mb-2">
                                <Badge variant="outline">{req.method}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(req.timestamp)}
                                </span>
                              </div>
                              <div className="text-sm flex items-center">
                                <span className="font-semibold mr-1">Token:</span>
                                <code className="bg-muted-foreground/10 px-1 rounded truncate max-w-[300px]">
                                  {showTokens ? req.authToken : (req.authToken ? maskSensitiveValue(req.authToken) : "")}
                                </code>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 ml-1"
                                  onClick={() => setShowTokens(!showTokens)}
                                >
                                  {showTokens ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>No Authentication Data</AlertTitle>
                      <AlertDescription>
                        No authentication tokens have been captured yet.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="userInfo" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Information</CardTitle>
                  <CardDescription>
                    User data retrieved from Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {requests.filter(r => r.userInfo).length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {requests
                          .filter(r => r.userInfo)
                          .map((req, idx) => (
                            <div key={idx} className="p-2 border rounded">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  <span className="text-sm font-medium">
                                    {req.userInfo?.email || "User"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(req.timestamp)}
                                </span>
                              </div>
                              <div className="text-xs font-mono bg-muted p-2 rounded">
                                <pre>{formatJson(req.userInfo)}</pre>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>No User Data</AlertTitle>
                      <AlertDescription>
                        No user information has been captured yet.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
} 