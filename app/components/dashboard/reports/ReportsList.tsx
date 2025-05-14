"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { CheckCircle2, ChevronDown, ChevronRight, Globe, Shield, ShieldAlert, ShieldCheck, Trash2, XCircle, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboard } from "../DashboardProvider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import SecurityScoreTrend from "./SecurityScoreTrend"

type ScanReport = {
  id: string
  url: string
  score: number
  headers: {
    present: string[]
    missing: string[]
  }
  leaks: Array<{
    type: string
    preview: string
    details: string
  }>
  js_files_scanned: number
  created_at: string
}

export default function ReportsList() {
  const [reports, setReports] = useState<ScanReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedReports, setExpandedReports] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [selectedUrlForTrend, setSelectedUrlForTrend] = useState<string | null>(null)
  const [visibleReports, setVisibleReports] = useState(10) // Number of reports to display

  // Add reference to the trend section for scrolling
  const trendSectionRef = useRef<HTMLDivElement>(null)
  
  const { user } = useDashboard()
  const supabase = createClient()

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return

      setLoading(true)
      const { data, error } = await supabase
        .from('scan_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching scan reports:', error)
      } else {
        setReports(data || [])
      }
      setLoading(false)
    }

    fetchReports()
  }, [user, supabase])

  const toggleReportExpanded = (reportId: string) => {
    setExpandedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    )
  }

  const handleDeleteReport = async () => {
    if (!reportToDelete) return

    const { error } = await supabase
      .from('scan_reports')
      .delete()
      .eq('id', reportToDelete)

    if (error) {
      console.error('Error deleting report:', error)
    } else {
      setReports(prev => prev.filter(report => report.id !== reportToDelete))
    }

    setReportToDelete(null)
    setDeleteConfirmOpen(false)
  }

  const confirmDelete = (reportId: string) => {
    setReportToDelete(reportId)
    setDeleteConfirmOpen(true)
  }

  // Handle viewing trend and scrolling
  const handleViewTrend = (url: string) => {
    setSelectedUrlForTrend(url)
    
    // Use setTimeout to scroll after the component has rendered
    setTimeout(() => {
      if (trendSectionRef.current) {
        trendSectionRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  }

  // Load more reports
  const loadMoreReports = () => {
    setVisibleReports(prev => prev + 10);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get reports to display based on pagination
  const displayedReports = reports.slice(0, visibleReports);
  const hasMoreReports = reports.length > visibleReports;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Scan Reports</CardTitle>
          <CardDescription>
            View your past website security scans and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium">No scan reports yet</h3>
              <p className="text-muted-foreground mb-4">
                When you scan websites, they will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedReports.map((report) => (
                <div key={report.id} className="border rounded-lg overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4 bg-secondary">
                        <Globe className="h-5 w-5" />
                      </Avatar>
                      <div>
                        <h3 className="font-medium truncate max-w-[200px] md:max-w-[300px]">
                          {report.url}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(report.created_at), 'PPP')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>{report.js_files_scanned} files scanned</span>
                      </div>

                      <div className={`px-3 py-1 rounded-full text-sm ${
                        report.score >= 70
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                          : report.score >= 40
                          ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                      }`}>
                        Score: {report.score}/100
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReportExpanded(report.id)}
                        >
                          {expandedReports.includes(report.id) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTrend(report.url)}
                          className="text-primary"
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          View Trend
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(report.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {expandedReports.includes(report.id) && (
                    <div className="border-t p-4 bg-secondary/5">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-semibold mb-3">
                            <ShieldCheck className="inline-block w-5 h-5 mr-2 text-green-500" />
                            Security Headers
                          </h4>
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium mb-2">Present ({report.headers.present.length}):</p>
                            {report.headers.present.length > 0 ? (
                              <ul className="grid grid-cols-1 gap-1">
                                {report.headers.present.map((header) => (
                                  <li key={header} className="text-sm flex items-center">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                    {header}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">None</p>
                            )}
                            
                            <p className="text-sm font-medium mt-4 mb-2">Missing ({report.headers.missing.length}):</p>
                            {report.headers.missing.length > 0 ? (
                              <ul className="grid grid-cols-1 gap-1">
                                {report.headers.missing.map((header) => (
                                  <li key={header} className="text-sm flex items-center">
                                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                    {header}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">None</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold mb-3">
                            <ShieldAlert className="inline-block w-5 h-5 mr-2 text-amber-500" />
                            Detected Leaks
                          </h4>
                          {report.leaks.length > 0 ? (
                            <ul className="space-y-2">
                              {report.leaks.map((leak, index) => {
                                // Check if it's a Supabase leak with properly configured RLS
                                const isSecureSupabase = 
                                  leak.type === 'Supabase Credentials' && 
                                  leak.details.includes('RLS appears to be configured correctly');
                                
                                return (
                                  <li 
                                    key={index} 
                                    className={`border rounded p-2 ${
                                      isSecureSupabase 
                                        ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20' 
                                        : ''
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      {isSecureSupabase ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                      ) : null}
                                      <p className={`font-medium text-sm ${
                                        isSecureSupabase ? 'text-green-800 dark:text-green-300' : ''
                                      }`}>
                                        {isSecureSupabase 
                                          ? 'Supabase (RLS Enabled)' 
                                          : leak.type}
                                      </p>
                                    </div>
                                    <p className="text-xs font-mono bg-secondary/30 p-1 rounded mt-1 overflow-x-auto">
                                      {leak.preview}
                                    </p>
                                    {isSecureSupabase && (
                                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        Supabase found with Row Level Security (RLS) correctly configured - good security practice!
                                      </p>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No leaks detected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Load More button */}
              {hasMoreReports && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMoreReports}
                    className="w-full max-w-xs"
                  >
                    Load More Reports
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add ref to trend section for scrolling */}
      {selectedUrlForTrend && (
        <div className="mt-6" ref={trendSectionRef}>
          <SecurityScoreTrend urlToAnalyze={selectedUrlForTrend} />
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the scan report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 