"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

// =============================================================================
// TOAST / NOTIFICATIONS
// Powered by Sonner - https://sonner.emilkowal.ski
// =============================================================================

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-background text-foreground border shadow-lg rounded-lg",
          title: "font-semibold",
          description: "text-muted-foreground text-sm",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-destructive/50 text-destructive",
          success: "border-green-500/50 text-green-600",
          warning: "border-yellow-500/50 text-yellow-600",
          info: "border-blue-500/50 text-blue-600",
        },
      }}
      richColors
      closeButton
    />
  );
}

// Re-export toast for convenience
export { toast };

// =============================================================================
// USAGE EXAMPLES
// =============================================================================
// import { toast } from "@/components/ui/Toast";
//
// // Basic
// toast("Event created");
// toast.success("Profile saved!");
// toast.error("Something went wrong");
// toast.warning("Please check your input");
// toast.info("New update available");
//
// // With description
// toast.success("Success!", {
//   description: "Your changes have been saved.",
// });
//
// // With action
// toast("File deleted", {
//   action: {
//     label: "Undo",
//     onClick: () => restoreFile(),
//   },
// });
//
// // Promise toast (loading → success/error)
// toast.promise(saveData(), {
//   loading: "Saving...",
//   success: "Saved!",
//   error: "Could not save",
// });
//
// // Custom duration (ms)
// toast("Quick message", { duration: 2000 });
//
// // Dismiss programmatically
// const id = toast("Loading...");
// toast.dismiss(id);
