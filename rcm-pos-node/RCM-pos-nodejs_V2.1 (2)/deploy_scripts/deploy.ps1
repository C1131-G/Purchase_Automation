##
# Need to run this command beforehand to allow PowerShell execute the script,
#		Set-ExecutionPolicy RemoteSigned -Scope CurrentUser 
# When you are done, you can set the policy back to its default value with,
#		Set-ExecutionPolicy Restricted -Scope CurrentUser
##

#### Usage Samples: ####
## Manual execution from PowerShell
#  ./powershell_scripts/deploy.ps1 deploy UAT -verbose
#  ./powershell_scripts/deploy.ps1 rollback UAT -verbose

## package.json
# 	"deploy": "@powershell -NoProfile -ExecutionPolicy Unrestricted -Command ./powershell_scripts/deploy.ps1 deploy",
#   "rollback": "@powershell -NoProfile -ExecutionPolicy Unrestricted -Command ./powershell_scripts/deploy.ps1 rollback",

## From Command Prompt, after executing "npm run build:uat".
#	npm run deploy uat
#	npm run rollback uat
## NOTE: 
#	- The $env argument can be passed right after the script name "deploy" or "rollback", it will passed as the last argument to
#	  the PowerShell script "./deploy.ps1"
#	- Arguments passed to PowerShell scripts are NOT case sensitive, so both the below commands will work


[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $command,
    [Parameter(Mandatory = $true, Position = 1)]
    [string] $env
)

$server_dir = ""
if($env -eq "ajax.uat") {
	$server_dir = "\\172.18.20.94\pos\Ajax\UAT"
}
elseif($env -eq "ajax.prod") {
	$server_dir = "\\172.18.20.94\pos\Ajax\Prod"
}
if($env -eq "rcm.uat") {
	$server_dir = "\\172.18.20.94\pos\RCM\UAT"
}
elseif($env -eq "rcm.prod") {
	$server_dir = "\\172.18.20.94\pos\RCM\Prod"
}

$build_path = "./app"
$deployment_path = "$server_dir\API\app"
$backup_dir = "$server_dir\__backup\API"

##Deletes the whole Deployment Dir or its content
function deleteDeploymentDirContent($type) {
	if($type -eq "DIR") {
		echo "Deleting old /app directory..."
		Remove-Item "$deployment_path" -Recurse
	}
	elseif($type -eq "CONTENT") {
		echo "Deleting old /app dir's contents..."
		Remove-Item "$deployment_path\*" -Recurse
	}
}

##Backup the current deployment folder contents and deletes it
function backupDeploymentDir {
	##Create a file name with Current Date/Time
	$backup_file = "API__$(Get-Date -f dd-MMM-yyyy__hh-mm-ss).zip"
	if ( Test-Path $backup_dir ) {
		##write-verbose "Backup directory exists!"
	}
	else {
		echo "Backup directory doesn't exist. Creating one..."
		New-Item -Path $backup_dir -ItemType Directory 
	}

	echo "Archiving the contents of the /app directory $deployment_path..."
	Compress-Archive -Path "$deployment_path" -DestinationPath "$backup_dir/$backup_file"
	
	echo "Archive $backup_file created under $backup_dir..."
	
	deleteDeploymentDirContent "CONTENT"
}

##Deploys the latest build to Deployment dir
function deployToServer {
	##Check if the Deployment Path has files in it
	if ( Test-Path $deployment_path ) {
		##echo "Deployment directory Exists!"
		
		##Backup the current deployment dir if it exists
		backupDeploymentDir
	} else {
		echo "Deployment directory doesn't exist. Creating one..."
		New-Item -Path $deployment_path -ItemType Directory 
	}
    echo "Deploying files to $deployment_path..."
    Copy-Item "$build_path/*" -Destination $deployment_path -Recurse -force
    echo "*** $env -- Deployment completed successfully!"
}

##Deletes the Deployment Dir content and copies the latest backup to it
function rollbackLastDeployment {

	##Check if the /__backup dir has atleast one zip file. 'Select-Object -First 1' will stop the recursive call once the 1st obj. is found
	if((Get-ChildItem $backup_dir -force | Select-Object -First 1).Count -ne 0) {
		
		##Delete the existing deployment dir
		deleteDeploymentDirContent "DIR"
		
		##Get the latest zip and extract it into the /UI folder
		$latestZip = Get-ChildItem $backup_dir | Sort LastWriteTime | Select -Last 1
		echo "Copying backup files to /app dir $server_dir..."
		Expand-Archive -Path "$backup_dir/$latestZip" -DestinationPath $server_dir
		echo "*** $env -- Rollback completed successfully!"
	}
	else {
		echo "No backup found... Aborting rollback operation!"
	}
	
}

try{
    switch ($command){
        "deploy" { deployToServer }
        "rollback" { rollbackLastDeployment }
    }
}catch {
    throw $_
	echo "*** Deployment Failed! ***"
}
