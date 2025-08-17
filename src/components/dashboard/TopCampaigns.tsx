import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Edit,
  Pause,
  Play
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const campaigns = [
  {
    id: 1,
    name: 'SaaS Enterprise Outreach',
    status: 'active',
    progress: 78,
    sent: 1247,
    responses: 312,
    responseRate: 25.0,
    trend: 'up',
    trendValue: '+12.3%'
  },
  {
    id: 2,
    name: 'Enterprise Lead Gen',
    status: 'active',
    progress: 45,
    sent: 892,
    responses: 178,
    responseRate: 19.9,
    trend: 'up',
    trendValue: '+8.7%'
  },
  {
    id: 3,
    name: 'Q4 Product Launch',
    status: 'paused',
    progress: 23,
    sent: 456,
    responses: 89,
    responseRate: 19.5,
    trend: 'down',
    trendValue: '-3.2%'
  },
  {
    id: 4,
    name: 'Webinar Promotion',
    status: 'completed',
    progress: 100,
    sent: 2134,
    responses: 487,
    responseRate: 22.8,
    trend: 'up',
    trendValue: '+15.1%'
  },
  {
    id: 5,
    name: 'Holiday Special',
    status: 'draft',
    progress: 0,
    sent: 0,
    responses: 0,
    responseRate: 0,
    trend: 'neutral',
    trendValue: 'New'
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800'
    case 'completed':
      return 'bg-blue-100 text-blue-800'
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <Play className="h-3 w-3" />
    case 'paused':
      return <Pause className="h-3 w-3" />
    case 'completed':
      return <TrendingUp className="h-3 w-3" />
    default:
      return null
  }
}

export function TopCampaigns() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Top Campaigns
        </CardTitle>
        <p className="text-sm text-gray-600">
          Your best performing outreach campaigns
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                  <Badge variant="secondary" className={`text-xs ${getStatusColor(campaign.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(campaign.status)}
                      <span className="capitalize">{campaign.status}</span>
                    </div>
                  </Badge>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Campaign
                    </DropdownMenuItem>
                    {campaign.status === 'active' ? (
                      <DropdownMenuItem>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Campaign
                      </DropdownMenuItem>
                    ) : campaign.status === 'paused' ? (
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Resume Campaign
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Progress Bar */}
              {campaign.status !== 'draft' && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">{campaign.progress}%</span>
                  </div>
                  <Progress value={campaign.progress} className="h-2" />
                </div>
              )}
              
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Sent</p>
                  <p className="font-medium text-gray-900">{campaign.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Responses</p>
                  <p className="font-medium text-gray-900">{campaign.responses.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Rate</p>
                  <div className="flex items-center space-x-1">
                    <p className="font-medium text-gray-900">{campaign.responseRate}%</p>
                    {campaign.trend === 'up' && (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs">{campaign.trendValue}</span>
                      </div>
                    )}
                    {campaign.trend === 'down' && (
                      <div className="flex items-center text-red-600">
                        <TrendingDown className="h-3 w-3" />
                        <span className="text-xs">{campaign.trendValue}</span>
                      </div>
                    )}
                    {campaign.trend === 'neutral' && (
                      <span className="text-xs text-gray-500">{campaign.trendValue}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}