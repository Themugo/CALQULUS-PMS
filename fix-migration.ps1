# PHASE 2D.1 SAFEGUARD: disabled.
Write-Error 'REFUSED (Phase 2D.1): this legacy script rewrites files in supabase/migrations/. Migration files must not be edited, renamed or regenerated while reconciliation is unresolved. See docs/engineering/PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS.md.'
exit 1
$file = "c:\Users\hp\Desktop\CALQULUS-RMS\supabase\migrations\20230101000000_base_schema.sql"
$content = Get-Content $file
$newContent = @()

for ($i = 0; $i -lt $content.Count; $i++) {
    $newContent += $content[$i]
    if ($content[$i] -match 'FOREIGN KEY \(manager_id\) REFERENCES public\.profiles\(id\) ON DELETE CASCADE;') {
        $newContent += "  END IF;"
        $newContent += "END $$;"
    }
}

$newContent | Set-Content $file
Write-Host "Fixed migration file"
