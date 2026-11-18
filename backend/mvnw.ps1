param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)
& "$PSScriptRoot\..\backend_tools\apache-maven-3.9.9\bin\mvn.cmd" @Args
