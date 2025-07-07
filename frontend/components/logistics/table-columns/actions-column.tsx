@@ .. @@
   return {
     id: "actions",
     header: "Actions",
-    cell: ({ row }) => {
+    cell: ({ row }) => {
+      const handleArchive = async (e: React.MouseEvent) => {
+        e.stopPropagation()
+        try {
+          await onArchiveClick(row.original)
+        } catch (error) {
+          console.error('Error archiving entry:', error)
+        }
+      }
+
+      const handleRestore = async (e: React.MouseEvent) => {
+        e.stopPropagation()
+        if (onRestoreClick) {
+          try {
+            await onRestoreClick(row.original)
+          } catch (error) {
+            console.error('Error restoring entry:', error)
+          }
+        }
+      }
+
       return (
         <div className="flex items-center gap-2">
           {isArchived ? (
             <Button
               variant="ghost"
               size="icon"
-              onClick={() => onRestoreClick?.(row.original)}
+              onClick={handleRestore}
               title="Restore entry"
             >
               <RotateCcw className="h-4 w-4" />
@@ .. @@
             <Button
               variant="ghost"
               size="icon"
-              onClick={() => onArchiveClick(row.original)}
+              onClick={handleArchive}
               title="Archive entry"
             >
               <Archive className="h-4 w-4" />
             </Button>
           )}
           <Button
             variant="ghost"
             size="icon"
-            onClick={() => onDeleteClick(row.original)}
+            onClick={(e) => {
+              e.stopPropagation()
+              onDeleteClick(row.original)
+            }}
             className="text-destructive hover:text-destructive/90"
             title="Delete entry"
           >
             <Trash2 className="h-4 w-4" />
           </Button>
         </div>
       )
     },
     size: 100
   }
 }