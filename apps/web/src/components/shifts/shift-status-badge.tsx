import { Badge } from "@findmystaff/ui/components/badge";

export function ShiftStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "open":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Open
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Pending
        </Badge>
      );
    case "assigned":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Assigned
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
