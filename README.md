Prerequisites

- Deploy the Digital User Engagement (DUE) Event Database solution before continuing
  - After you have deployed this solution, gather the following data from the stack’s “Resources” section.
    - “DUES3DataLake“: You will need the bucket name
    - “PinpointProject”: You will need the project Id
    - “ PinpointEventDatabase": This is the name of the Glue Database. You will only need this if you used something other than the default of "due_eventdb"

Note: If you are installing the DUE event database for the first time as part of these instructions, your dashboard will not have any data to show until new events start to come in from your Amazon Pinpoint project.

Once you have the DUE event database installed, you are ready to begin your deployment.

Step 1 - Ensure that Amazon Athena is setup to store query results

Amazon Athena is a serverless query service that makes it easy to analyze large volumes of data stored in Amazon S3 using standard SQL. It uses “workgroups” to separate users, teams, applications, or workloads, to set limits on amount of data each query or the entire workgroup can process, and to track costs. There is a default workgroup called “primary” However, before you can use this workgroup, it needs to be configured with an Amazon S3 bucket for storing the query results.

1. If you do not have an existing S3 bucket you can use for the output, create a new Amazon S3 bucket.
2. Navigate to the Amazon Athena console and from the menu select workgroups > primary > Edit > Query result configuration
   1. Select the Amazon S3 bucket and any specific directory for the Athena query result location

Note: If you choose to use a workgroup other that the default “primary” workgroup. Please take note of the workgroup name to be used later.

Step 2 - Enable Amazon QuickSight

Amazon QuickSight offers two types of data sets: Direct Query data sets, which provides real-time access to data sources, and SPICE (Super-fast, Parallel, In-memory Calculation Engine) data sets, which are pre-aggregated and cached for faster performance and scalability that can be refreshed on a schedule.

This solution uses SPICE datasets set to a incrementally refresh on a cycle of your choice (Daily or Hourly). SPICE datasets improve the performance of the Dashboard by locally caching the data from the Athena views. If you have already setup Amazon QuickSight, please navigate to QuickSight in the AWS Console and skip to step 3.

1. Navigate to Amazon QuickSight on the AWS console
2. Setup Amazon QuickSight account by clicking the “Sign up for QuickSight” button.
   1. You will need to setup an Enterprise account for this solution.
   2. To complete the process for the QuickSight account setup follow the instructions at this link.
3. Ensure you have the Admin Role
   1. Choose the profile icon in the top right corner, and then select Manage QuickSight.
   2. Click on Manage Users.
   3. Subscription details should display on the screen.
4. Ensure you have enough SPICE capacity for the datasets
   1. Choose the profile icon, and then select Manage QuickSight.
   2. Click on SPICE Capacity
   3. Make sure you enough SPICE for all three datasets
      1. if you are still in the free tier, you should have enough for initial testing.
      2. You will need about 2GB of capacity for every 1,000,000 Pinpoint events that will be ingested in to SPICE
      3. Note: If you do not have enough SPICE capacity, deployment will fail
5. Please note the Amazon QuickSight username. You can find this by clicking profile icon.
   1. Example username: “Admin/user-name”

Step 3 - Collect the Amazon QuickSight Service Role name in IAM

For Amazon Athena, Amazon S3, and Athena Query Federation connections, Amazon QuickSight uses the following IAM “consumer” role by default: aws-quicksight-s3-consumers-role-v0

If the “consumer” role is not present, then QuickSight uses the following “service” role instead : aws-quicksight-service-role-v0.

The version number at the end of the role could be different in your account. Please validate your role name with the following steps.

1. Navigate to the Identity and Access Management (IAM) console
2. Go to Roles and search “QuickSight”
3. If the "consumer" role exists, please note its full name.
4. If you only find the “service” role, please note its full name.

Note: For more details on these service roles, please see the QuickSite User Guide

Step 4 - Prepare CDK solution

The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to model and provision your cloud application resources using familiar programming languages. Deploying this solution requires no previous experience with the CDK toolkit. If you would like to familiarize yourself with CDK, the AWS CDK Workshop is a great place to start.

1.  Prepare your integrated development environment (IDE)
    1. Option 1: Use AWS Cloud9 - a cloud-based IDE that lets you write, run, and debug your code with just a browser.
       1. Navigate to the AWS Cloud9 console and select Create Environment
       2. Give a descriptive name to your environment e.g. PinpointAnalysis
       3. Keep the default values under Environment Settings
       4. Open the Cloud9 IDE
          1. Node, TypeScript, and CDK should be come pre-installed. Test this by running the following commands in your terminal.
             1. node --version
             2. tsc --version
             3. cdk --version
          2. If dependencies are not installed, follow the Step 1 instructions from this article.
       5. Please note that using AWS Cloud 9 will incur a nominal charge if you are no longer Free Tier eligible. However, using Cloud9 will simplify things if you do not already have a local environment setup with CDK and the AWS CLI.
    2. Option 2: local IDE such as VS Code
       1. Setup CDK locally using this documentation
       2. Install Node, TypeScriptand the AWS CLI
          1. Once the CLI is installed, configure your AWS credentials
             1. aws configure
2.  Clone the Pinpoint Dashboard Solution
    1.  git clone https://github.com/aws-samples/digital-user-engagement-events-dashboards.git
3.  Install the required npm packages from package.json
    1. cd digital-user-engagement-events-dashboards
    2. npm install

Open the file at digital-user-engagement-events-dashboards/bin/pinpoint-bi-analysis.ts for editing in your IDE.

    1. Edit the following code block your your solution with the information you have gathered in the previous steps.  Please reference Table 1 for a description of each editable field.

const resourcePrefix = "pinpoint*analytics*";

...

new MainApp(app, "PinpointAnalytics", {
env: {
region: "us-east-1",
}

//Attributes to change
dueDbBucketName: "{bucket-name}",
pinpointProjectId: "{pinpoint-project-id}",
qsUserName: "{quicksight-username}",

//Default settings
athenaWorkGroupName: "primary",
dataLakeDbName: "due_eventdb",
dateRangeNumberOfMonths: 6,
qsUserRegion: "us-east-1",
qsDefaultServiceRole: "aws-quicksight-service-role-v0",
spiceRefreshInterval: "HOURLY",

//Constants
athena_util: athena_util,
qs_util: qs_util,
});

Attribute, definition, and example from code snippet above
resourcePrefix: The prefix for all created Athena and QuickSight resources. Example - "pinpoint*analytics*"
region: Where new resources will be deployed. This must be the same region that the DUE event database solution was deployed. Example - "us-east-1"
dueDbBucketName: The name of the DUE event database S3 Bucket. Example - "due-database-xxxxxxxxxxus-east-1"
qsUserName: The name of your QuickSight User. Example - "Admin/my-user"
athenaWorkGroupName: The Athena workgroup that was previously configured. Example - "primary"
dataLakeDbName: The Glue database created during the DUE event database solution. By default the database name is "due_eventdb". Example - "due_eventdb"
dateRangeNumberOfMonths: The number of months of data the Athena views will contain. QuickSight SPICE datasets will contain this many months of data initially and on full refresh. The QuickSight dataset will add new data incrementally without deleting historical data. Example - "6"
qsUserRegion: The region where your quicksight user exists. By default, new users will be created in us-east-1. You can check your user location with the AWS CLI: aws quicksight list-users --aws-account-id {accout-id} --namespace default and look for the region in the arn. Example - "us-east-1"
qsDefaultServiceRole: The service role collected during Step 3. Example - "aws-quicksight-service-role-v0"
spiceRefreshInterval: Options Include "HOURLY", "DAILY" - This is how often the SPICE 7-day incremental window will be refreshed. Example - "DAILY"

Step 5 - Deploy

1. CDK requires you to bootstrap in each region of an account. This creates a S3 bucket for deployment. You only need to bootstrap once per account/region
   1. cdk bootstrap
2. Deploy the application
   1. cdk deploy

Step 6 - Explore

1. Once your solution deploys, look for the “Outputs“ provided by the CDK CLI. You will find a link to your new Quicksight Analysis, or Dashboard, as well as a few other key resources. Feel free to explore the “resources” sections of the deployed stacks in CloudFormation for a complete list of deployed resources.

MAINTAINENCE

How to add Athena Named Query/View

1. Create Athena named view
2. Add query id to custom view helper lambda environment variables
3. Add the environment variable key to the execute_named_queries list.

How to add columns to Athena View

1. Change the SQL statement in constructs/athena-named-queries
2. Add the desired column from all_events or join in the data to Athena Named Query

How to update columns in QuickSight dataset
Create the dataset manually using console. Then describe the dataset. Update the columns in qs-util or quicksight-data-set construct

1. Add Column to Athena View
2. aws quicksight list-data-sets --aws-account-id {account id}
3. aws quicksight describe-data-set --aws-account-id {account id} --data-set-id {data-set-id}
4. Get columns and update in qs_util

How to update quicksight analysis
Create the dataset manually using console. Then describe the dataset. Update the columns in qs-util or quicksight-data-set construct

1. aws quicksight list-analyses --aws-account-id {account id}
2. aws quicksight describe-analysis-definition --aws-account-id {account id} --analysis-id {analysis id}
3. Update template in ./Athena_QuickSight-CDK/qs_analysis_definitions. Use > or stdout to output the template json to a file.
