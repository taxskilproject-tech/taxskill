import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import type { UserListProps } from "@/features/users/types/user-list.types";

export function UserList({ users, selected, onSelect }: UserListProps) {
  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
      {users.map((user) => (
        <li
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-1"
          key={user.member.id}
        >
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">{user.profile.full_name}</p>
            <p className="text-sm break-all text-zinc-500">
              {user.profile.email}
            </p>
            <div className="flex gap-2">
              <Badge>
                {user.member.is_admin
                  ? "Administrador"
                  : user.member.member_type === "client"
                    ? "Cliente"
                    : "Equipo"}
              </Badge>
              <Badge
                tone={
                  user.profile.enabled && user.member.active
                    ? "success"
                    : "neutral"
                }
              >
                {user.profile.deleted_at || user.member.deleted_at
                  ? "Eliminado"
                  : user.profile.enabled && user.member.active
                    ? "Habilitado"
                    : "Inhabilitado"}
              </Badge>
            </div>
          </div>
          <Button
            aria-expanded={selected === user.member.id}
            onClick={() =>
              onSelect(selected === user.member.id ? "" : user.member.id)
            }
            variant="secondary"
          >
            Gestionar usuario
          </Button>
        </li>
      ))}
    </ul>
  );
}
