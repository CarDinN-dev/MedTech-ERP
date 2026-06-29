import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordModal } from "@/components/record-modal";

describe("RecordModal form validation", () => {
  it("blocks submission until the required primary field is provided", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<RecordModal open title="Add department" columns={["Department", "Code", "Status"]} onClose={vi.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save record" }));
    expect(onSave).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Department"), "Clinical Engineering");
    await user.click(screen.getByRole("button", { name: "Save record" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ Department: "Clinical Engineering" }));
  });

  it("enforces email type and minimum temporary password length for new users", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<RecordModal open title="Add user" columns={["User", "Email", "Password"]} onClose={vi.fn()} onSave={onSave} />);
    await user.type(screen.getByLabelText("User"), "Finance Test");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password (temporary)"), "short");
    await user.click(screen.getByRole("button", { name: "Save record" }));
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "finance.test@medtech.qa");
    await user.clear(screen.getByLabelText("Password (temporary)"));
    await user.type(screen.getByLabelText("Password (temporary)"), "MedTech@Test2026!");
    await user.click(screen.getByRole("button", { name: "Save record" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
