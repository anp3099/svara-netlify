import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const activities = [
  {
    id: 1,
    type: 'email_sent',
    title: 'Email sequence sent to TechCorp leads',
    description: '47 emails delivered successfully',
    time: '2 minutes ago',
    status: 'success',
    icon: Mail,
    count: 47
  },
  {
    id: 2,
    type: 'response_received',
    title: 'New response from Sarah Johnson',
    description: 'Interested in enterprise package',
    time: '15 minutes ago',
    status: 'positive',
    icon: MessageSquare,
    company: 'DataFlow Inc'
  },
  {
    id: 3,
    type: 'sequence_generated',
    title: 'AI generated new sequence',
    description: 'SaaS Outreach Campaign - 5 step sequence',
    time: '1 hour ago',
    status: 'info',
    icon: TrendingUp,
    aiGenerated: true
  },
  {
    id: 4,
    type: 'call_scheduled',
    title: 'Sales call scheduled',
    description: 'Michael Chen - Tomorrow 2:00 PM',
    time: '2 hours ago',
    status: 'scheduled',
    icon: Phone,
    company: 'InnovateLabs'
  },
  {
    id: 5,
    type: 'campaign_completed',
    title: 'Q4 Outreach Campaign completed',
    description: '89% delivery rate, 23% response rate',
    time: '3 hours ago',
    status: 'completed',
    icon: CheckCircle,
    metrics: { delivery: 89, response: 23 }
  },
  {
    id: 6,
    type: 'bounce_alert',
    title: 'High bounce rate detected',
    description: 'TechStartup Campaign - 12% bounce rate',
    time: '4 hours ago',
    status: 'warning',
    icon: AlertCircle,
    bounceRate: 12
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'positive':
      return 'bg-blue-100 text-blue-800'
    case 'info':
      return 'bg-purple-100 text-purple-800'
    case 'scheduled':
      return 'bg-amber-100 text-amber-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'warning':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getIconColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'text-green-600'
    case 'positive':
      return 'text-blue-600'
    case 'info':
      return 'text-purple-600'
    case 'scheduled':
      return 'text-amber-600'
    case 'completed':
      return 'text-green-600'
    case 'warning':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Recent Activity
        </CardTitle>
        <p className="text-sm text-gray-600">
          Latest updates from your campaigns
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ${getIconColor(activity.status)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      {activity.aiGenerated && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          AI
                        </Badge>
                      )}
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  
                  {activity.company && (
                    <div className="flex items-center mt-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-primary text-white">
                          {activity.company ? activity.company.charAt(0) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-500 ml-2">{activity.company}</span>
                    </div>
                  )}
                  
                  {activity.metrics && (
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-500">
                        Delivery: {activity.metrics.delivery}%
                      </span>
                      <span className="text-xs text-gray-500">
                        Response: {activity.metrics.response}%
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.time}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}