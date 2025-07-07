@@ .. @@
   const [selectedEntry, setSelectedEntry] = useState<LogisticsEntry | null>(null)
   const [confirmationOpen, setConfirmationOpen] = useState(false)
+  const router = useRouter()
 
   const handleScan = (entry: LogisticsEntry) => {
     setSelectedEntry(entry)
     setConfirmationOpen(true)
   }
 
+  const handleSuccess = () => {
+    // Refresh the logistics page data
+    router.refresh()
+  }
+
   return (
     <div className="flex flex-col p-6 gap-6">
       <h1 className="text-2xl font-bold tracking-tight">Logistics Receiving</h1>
@@ .. @@
       <ReceivingConfirmation
         entry={selectedEntry}
         open={confirmationOpen}
         onOpenChange={setConfirmationOpen}
+        onSuccess={handleSuccess}
       />