[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $command,
    [Parameter(Mandatory = $true, Position = 1)]
    [string] $env
)

$server_dir = ""
switch ($env) {
    "ajax.uat" { $server_dir = "\\172.18.20.94\pos\Ajax\UAT" }
    "ajax.prod" { $server_dir = "\\172.18.20.94\pos\Ajax\Prod" }
    "rcm.uat" { $server_dir = "\\172.18.20.94\pos\RCM\UAT" }
    "rcm.prod" { $server_dir = "\\172.18.20.94\pos\RCM\Prod" }
}

$build_path = "./build"
$deployment_path = "$server_dir\API\build"
$backup_dir = "$server_dir\__backup\UI"

## Utility function to map network path with credentials
function Map-NetworkPath {
    param (
        [string] $networkPath
    )

    $credential = Get-Credential -Message "Enter credentials for the network path"
    $driveLetter = "X"

    if (Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue) {
        Remove-PSDrive -Name $driveLetter -Force
    }

    try {
        New-PSDrive -Name $driveLetter -PSProvider FileSystem -Root $networkPath -Credential $credential -Persist
    } catch {
        throw "Failed to map the network path. Please check your credentials and network access."
    }

    if (Test-Path "${driveLetter}:\") {
        return "${driveLetter}:\"
    } else {
        throw "Failed to map the network path."
    }
}

## Deletes the whole Deployment Dir or its content
function Delete-DeploymentDirContent {
    param (
        [string] $type,
        [string] $mappedDeploymentPath
    )

    if ($type -eq "DIR") {
        echo "Deleting old deployment directory..."
        Remove-Item -Path "$mappedDeploymentPath\API\build" -Recurse -Force
    } elseif ($type -eq "CONTENT") {
        echo "Deleting old deployment dir's contents..."
        Remove-Item -Path "$mappedDeploymentPath\API\build\*" -Recurse -Force
    }
}

## Backup the current deployment folder contents and deletes it
function Backup-DeploymentDir {
    param (
        [string] $mappedDeploymentPath
    )

    ## Create a file name with Current Date/Time
    $backup_file = "UI__$(Get-Date -f dd-MMM-yyyy__hh-mm-ss).zip"
    if (Test-Path "$mappedDeploymentPath\__backup\UI") {
        ## write-verbose "Backup directory exists!"
    } else {
        echo "Backup directory doesn't exist. Creating one..."
        New-Item -Path "$mappedDeploymentPath\__backup\UI" -ItemType Directory 
    }

    echo "Archiving the contents of the deployment directory $deployment_path..."
    Compress-Archive -Path "$deployment_path" -DestinationPath "$mappedDeploymentPath\__backup\UI\$backup_file"

    echo "Archive $backup_file created under $mappedDeploymentPath\__backup\UI..."

    Delete-DeploymentDirContent -type "CONTENT" -mappedDeploymentPath $mappedDeploymentPath
}

## Deploys the latest build to Deployment dir
function Deploy-ToServer {
    ## Map network path
    $mappedDeploymentPath = Map-NetworkPath -networkPath $server_dir

    ## Check if the Deployment Path has files in it
    if (Test-Path "$mappedDeploymentPath\API\build") {
        ## echo "Deployment directory Exists!"

        ## Backup the current deployment dir if it exists
        Backup-DeploymentDir -mappedDeploymentPath $mappedDeploymentPath
    } else {
        echo "Deployment directory doesn't exist. Creating one..."
        New-Item -Path "$mappedDeploymentPath\API\build" -ItemType Directory 
    }
    echo "Deploying files to $mappedDeploymentPath\API\build..."
    Copy-Item -Path "$build_path\*" -Destination "$mappedDeploymentPath\API\build" -Recurse -Force
    echo "*** $env -- Deployment completed successfully!"

    # Remove the mapped network drive
    Remove-PSDrive -Name "X" -Force
}

## Deletes the Deployment Dir content and copies the latest backup to it
function Rollback-LastDeployment {
    ## Map network path
    $mappedBackupPath = Map-NetworkPath -networkPath $server_dir

    ## Check if the /__backup dir has at least one zip file. 'Select-Object -First 1' will stop the recursive call once the 1st obj. is found
    if ((Get-ChildItem "$mappedBackupPath\__backup\UI" -force | Select-Object -First 1).Count -ne 0) {
        ## Delete the existing deployment dir
        Delete-DeploymentDirContent -type "DIR" -mappedDeploymentPath $mappedBackupPath

        ## Get the latest zip and extract it into the /UI folder
        $latestZip = Get-ChildItem "$mappedBackupPath\__backup\UI" | Sort LastWriteTime | Select -Last 1
        echo "Copying backup files to deployment dir $mappedBackupPath..."
        Expand-Archive -Path "$mappedBackupPath\__backup\UI\$latestZip" -DestinationPath $mappedBackupPath
        echo "*** $env -- Rollback completed successfully!"

        # Remove the mapped network drive
        Remove-PSDrive -Name "X" -Force
    } else {
        echo "No backup found... Aborting rollback operation!"
    }
}

try {
    switch ($command) {
        "deploy" { Deploy-ToServer }
        "rollback" { Rollback-LastDeployment }
    }
} catch {
    throw $_
    echo "*** Deployment Failed! ***"
}
