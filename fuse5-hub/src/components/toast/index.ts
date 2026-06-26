// App-wide toast system.
//
// Mount once near the app root:
//   <ToastProvider>{children}</ToastProvider>
//
// Then from any client component below it:
//   const toast = useToast();
//   toast.success("Saved", { description: "All changes synced" });
//   toast.error("Failed to save");
//   toast.info("Sync started", { duration: 0 }); // sticky

export { ToastProvider, useToast } from "./toast-provider";
export type { Toast, ToastApi, ToastOptions, ToastVariant } from "./types";
