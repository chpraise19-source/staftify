import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import DemoWorkspace from "../src/components/demo/workspace";
import type { Role } from "../src/lib/domain";
function Preview() {
  const initial = window.location.hash.slice(1);
  const [role, setRole] = useState<Role>(
    initial === "nurse" || initial === "admin" ? initial : "facility",
  );
  return (
    <DemoWorkspace
      key={role}
      role={role}
      onRoleChange={(next) => {
        history.replaceState(null, "", "#" + next);
        setRole(next);
      }}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
