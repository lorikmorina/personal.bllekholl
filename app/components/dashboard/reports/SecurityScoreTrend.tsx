"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Label
} from "recharts"
import { format, parseISO } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import { ArrowUpCircle, Globe, Info, TrendingUp } from "lucide-react"

type ScanData = {
  id: string
  url: string
  score: number
  created_at: string
}

type ChartData = {
  date: string
  score: number
  formattedDate: string
}

export default function SecurityScoreTrend({ urlToAnalyze }: { urlToAnalyze: string }) {
  const [scans, setScans] = useState<ScanData[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useDashboard()
  const supabase = createClient()

  useEffect(() => {
    const fetchScanHistory = async () => {
      if (!user || !urlToAnalyze) return

      setLoading(true)
      const { data, error } = await supabase
        .from('scan_reports')
        .select('id, url, score, created_at')
        .eq('user_id', user.id)
        .eq('url', urlToAnalyze)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching scan history:', error)
      } else {
        setScans(data || [])
      }
      setLoading(false)
    }

    fetchScanHistory()
  }, [user, urlToAnalyze, supabase])

  // Transform data for chart
  const chartData: ChartData[] = scans.map(scan => ({
    date: scan.created_at,
    score: scan.score,
    formattedDate: format(parseISO(scan.created_at), 'MMM d')
  }))

  // Calculate improvements
  const firstScore = chartData.length > 0 ? chartData[0].score : 0
  const lastScore = chartData.length > 0 ? chartData[chartData.length - 1].score : 0
  const improvement = lastScore - firstScore
  const hasImproved = improvement > 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (scans.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Security Score Trend
          </CardTitle>
          <CardDescription>
            Scan this URL at least twice to see a security score trend
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Info className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            Not enough data to display a trend. Perform multiple scans on this URL over time to track security improvements.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Security Score Trend
        </CardTitle>
        <CardDescription className="flex items-center">
          <Globe className="h-4 w-4 mr-1" />
          {urlToAnalyze}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium">Overall Change:</h3>
            <div className={`px-3 py-1 rounded-full text-sm flex items-center ${
              hasImproved
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : improvement === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}>
              {hasImproved && <ArrowUpCircle className="h-4 w-4 mr-1" />}
              {improvement > 0 ? `+${improvement}` : improvement} points
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasImproved 
              ? `Security score has improved by ${improvement} points since your first scan.`
              : improvement === 0
              ? "Security score has remained the same across all scans."
              : `Security score has decreased by ${Math.abs(improvement)} points since your first scan.`
            }
          </p>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
              >
                <Label 
                  value="Security Score" 
                  angle={-90} 
                  position="insideLeft" 
                  style={{ textAnchor: 'middle', fontSize: 12 }} 
                />
              </YAxis>
              <Tooltip 
                formatter={(value) => [`Score: ${value}`, 'Security Score']}
                labelFormatter={(label) => `Date: ${label}`}
                labelStyle={{ color: '#1f2937' }}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
              />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3">
                <Label value="Good" position="right" fill="#10b981" />
              </ReferenceLine>
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3">
                <Label value="Medium" position="right" fill="#f59e0b" />
              </ReferenceLine>
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 8, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 