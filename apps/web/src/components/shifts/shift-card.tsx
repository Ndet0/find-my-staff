import { Card, CardContent } from "@findmystaff/ui/components/card";
import { ShiftStatusBadge } from "./shift-status-badge";

export interface ShiftCardData {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  required_role: string;
  required_specialty: string;
  status: string;
  hourly_pay_rate: number;
  facility?: { name: string } | null;
  assigned_provider?: { first_name: string; last_name: string } | null;
}

interface ShiftCardProps {
  shift: ShiftCardData;
  showPay?: boolean;
  showAssignedProvider?: boolean;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export function ShiftCard({
  shift,
  showPay = true,
  showAssignedProvider = true,
  actions,
  footer,
}: ShiftCardProps) {
  return (
    <Card className="border-green-100 dark:border-green-900 hover:shadow-sm transition-shadow">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-semibold">
              {shift.facility?.name} - {shift.date}
            </h2>
            <p className="text-sm text-muted-foreground">
              {shift.start_time} - {shift.end_time}
            </p>
            <p className="text-sm text-muted-foreground">
              {shift.required_role} | {shift.required_specialty}
            </p>
          </div>
          <div className="text-right">
            <ShiftStatusBadge status={shift.status} />
            {showPay && (
              <p className="text-sm font-medium text-green-700 mt-1">
                ${shift.hourly_pay_rate}/hr
              </p>
            )}
          </div>
        </div>
        {showAssignedProvider && shift.assigned_provider && (
          <p className="text-sm mt-2">
            Assigned: {shift.assigned_provider.first_name}{" "}
            {shift.assigned_provider.last_name}
          </p>
        )}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        {footer}
      </CardContent>
    </Card>
  );
}
