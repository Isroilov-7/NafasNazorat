import { Download, FileJson, History, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewUserForm } from "@/features/admin/new-user-form";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth/dal";
import { listRecentAudit } from "@/lib/server/repositories/audit";
import { listUsers } from "@/lib/server/repositories/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title") };
}

export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations();
  const users = listUsers();
  const audit = listRecentAudit(25);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("admin.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("admin.subtitle")}</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden="true" /> {t("admin.users")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("admin.name")}</TableHead>
                  <TableHead>{t("auth.email")}</TableHead>
                  <TableHead>{t("admin.role")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge size="sm" tone={u.role === "admin" ? "primary" : "neutral"}>
                        {t(`roles.${u.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular text-sm">{formatDate(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.addUser")}</CardTitle>
          </CardHeader>
          <CardContent>
            <NewUserForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> {t("admin.export")}
            </CardTitle>
            <CardDescription>{t("admin.exportBody")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/api/research-export?format=csv" download>
                <Download /> {t("admin.exportCsv")}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/research-export?format=json" download>
                <FileJson /> {t("admin.exportJson")}
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" aria-hidden="true" /> {t("admin.recentAudit")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm">
              {audit.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-x-4">
                  <span>
                    <span className="font-medium">{e.actorName}</span> · {t(`audit.entities.${e.entity}`)} — {t(`audit.actions.${e.action}`)}
                  </span>
                  <span className="tabular text-muted-foreground">{formatDateTime(e.at)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
