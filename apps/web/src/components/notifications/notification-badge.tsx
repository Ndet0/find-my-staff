import { Badge } from "@findmystaff/ui/components/badge";
import {
  Ban,
  CheckCircle,
  Info,
  UserCheck,
  UserX,
} from "lucide-react";

export function NotificationBadge({ type }: { type: string }) {
  switch (type) {
    case "assigned":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <UserCheck className="h-3 w-3 mr-1" />
          Assigned
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <Ban className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    case "accepted":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case "interest":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <Info className="h-3 w-3 mr-1" />
          Interest
        </Badge>
      );
    case "declined":
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          <UserX className="h-3 w-3 mr-1" />
          Declined
        </Badge>
      );
    default:
      return <Badge>{type}</Badge>;
  }
}

export function extractProviderInfo(message: string) {
  const match = message.match(/^(.+?)\s*\((.+?)\)/);
  if (match) {
    return { name: match[1], role: match[2] };
  }
  return null;
}
