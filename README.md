Prerequisites

- AWS account
- Deploy the digital user engagement event database (DUE DB) solution
  - Pinpoint events will only be captured once the DUE DB the solution is implemented
  - Note the following information during creation. Go to CloudFormation stack. Go to the outputs section.
    - DUE data lake S3 bucket arn
    - Pinpoint ProjectId
    - Athena events database name if different from default
    - The name of the database
- Customers should be prepared to purchase Amazon Quicksight because it has its own set of costs which is not covered within Amazon Pinpoint cost.

Step 1 - Ensure Athena has a workgroup with output query location

Amazon Athena is a serverless query service that makes it easy to analyze large volumes of data stored in Amazon S3 using standard SQL. Athena requires setting up an output location for query results.

1. Optional - Create a new S3 bucket. Create “query_output” directory
2. Navigate to the Athena console and from the menu select workgroups > primary > Edit > Query result configuration
   1. Select S3 bucket and directory for Athena query outputs

Note the following information

- The workgroup name if different than “primary”

Step 2 - Enable Quicksight

Amazon QuickSight is a cloud-based business intelligence (BI) and data visualization tool that allows users to create interactive dashboards and visualizations. It supports various data sources including Athena. QuickSight is highly scaleable. QuickSight offers two types of data sets: Direct Query data sets, which provides real-time access to data sources, and SPICE (Super-fast, Parallel, In-memory Calculation Engine) data sets, which are pre-aggregated and cached for faster performance and scalability that can be refreshed on a schedule.

This solution uses SPICE datasets set to a daily refresh cycle. SPICE datasets improves the performance of data from S3 and DynamoDB joined in Athena.

1. Navigate to Amazon Quicksight on the AWS console
2. Setup Amazon QuickSight account
   1. Create an Enterprise QuickSight Account
   2. For more information about QuickSight account setup follow this link.
3. Ensure you have the Admin Role
   1. Choose the profile icon, and then select Manage QuickSight.
   2. Click on Manage Users.
   3. Subscription details should display on the screen.
4. Ensure you have SPICE capacity
   1. Choose the profile icon, and then select Manage QuickSight.
   2. Click on SPICE Capacity
   3. Purchase enough SPICE for all three datasets
      1. If you do not have enough SPICE capacity, deployment will fail

Note the following information

- The QS username found by clicking profile icon
  - Example username “Admin/user-name”

Step 3 - Prepare CDK solution

The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to model and provision your cloud application resources using familiar programming languages. Deploying this solution requires no previous experience with the CDK toolkit. If you would like to familiarize yourself with CDK the CDKWorkshop is a great place to start.

1.  Prepare integrated development environment (IDE)
    1. Option 1: Cloud9 - a cloud-based IDE that lets you write, run, and debug your code with just a browser
       1. Navigate to the Cloud9 console and select Create Environment
       2. Give a descriptive name to your environment e.g. PinpointAnalysis
       3. Keep the default values under Environment Settings
       4. Open the Cloud9 IDE
          1. Node, TypeScript, and CDK should be come pre-installed. Test this by running the following commands
             1. node --version
             2. tsc --version
             3. cdk --version
          2. If dependencies are not installed, follow the Step 1 instructions from this article.
    2. Option 2: local IDE such as VS Code
       1. Setup CDK locally using this documentation
          1. install Node, TypeScript, CDK
          2. Configure AWS credentials using aws configure
2.  Clone Pinpoint Analysis Solution
    1.  git clone {Git hub repo}
3.  Install rquired npm packages from package.json
    1. cd {Repo Name}
    2. npm install
4.  Open the file at Project/Athena-QuickSight-CDK/bin/athena-quicksight-cdk.ts

    1. Edit the following code block your your solution
    2. new MainApp(app, "MainAppStack", {
       //Attributes to change
       bucketArn: "{bucket-arn}",
       pinpointProjectId: "{pinpoint-project-id}",
       qsUserName: "{quicksight-username}",

       //Default settings
       athenaWorkGroupName: "primary",
       dataLakeDbName: "due_eventdb",

       //Constants
       athena_util: athena_util,
       qs_util: qs_util,
       });

Step 4 - Deploy

1. Change directories into the CDK project
   1. cd Project/Athena-QuickSight-CDK
2. CDK requires you to bootstrap in each region of an account. This creates a S3 bucket
   1. cdk bootstrap
3. Deploy the application
   1. cdk deploy

Costs

- AWS CloudTrail
  - Cloud trail has pricing based on events recorded. These events can either fall into free tier or paid tier depending on event type. See more pricing info at this link
- AWS Lambda
  - Amazon Athena DynamoDB Connector
    - Depending on the quantity of Pinpoint journeys and campaigns price may vary. The costs for use of the connector depends on the underlying AWS resources that are used. Because queries that use scans can consume a large number of read capacity units (RCUs), consider the information for Amazon DynamoDB pricing carefully.
- Amazon QuickSight \* QuickSight also has charges for SPICE datasets. QuickSight has Enterprise and Standard editions. Both offer free 30 day trials. See more pricing differences at the pricing page.
- Amazon Athena
  - Athena has a cost per terabyte of data scanned. See more data here.
- S3
  - Storage for spill bucket and Athena query output objects. See more pricing information here

Clean up

- Delete the CDK stack
  - CDK destroy
- Delete QuickSight account
- Delete athena views
  _ Go to Glue > Data Catalog > Databases > Your Database Name
  _ Select and delete all views no longer neede
- Delete S3 buckets
  - Dynamo cloud watch log bucket
  - Dynamo Athena Connector Spill bucket
  - Athena workgroup output bucket

Considerations

- Pinpoint Standard account can be upgraded to an Enterprise account. Enterprise accounts cannot be downgraded to a Standard account.
- QS Analysis Event rates are calculated on Pinpoint message_id and endpoint_id grain - click rate will be the same if a user clicks an email link one or more than one times
- All timestamps are in UTC. To display data in another timezone edit event_timestamp_timezone calculated field in every dataset
- The created DynamoDB table with Pinpoint campaign and journey data is source of truth for campaign and journey info. Only campaigns that exist when solution is deployed or created after deployment will be populated in DynamoDB table
- How often the data gets updated in the dashboards?
- The solution is setup to

WHAT DO THE THREE DIFFERENT STACKS CREATED IN MAINAPP CREATE?
pinpoint-campaign-journey-db - This stack creates Pinpoint lookup tables that hold campaign/journey and segment data

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
3. aws quicksight describe-data-set --aws-account-id {account id} --data-set-id 3ab6fad1-573c-4733-9ff3-688ab1803d7a
4. Get columns and update in qs_util

How to update quicksight analysis
Create the dataset manually using console. Then describe the dataset. Update the columns in qs-util or quicksight-data-set construct

1. aws quicksight list-analyses --aws-account-id {account id}
2. aws quicksight describe-analysis-definition --aws-account-id {account id} --analysis-id {analysis id}
3. Update template in ./Athena_QuickSight-CDK/qs_analysis_definitions. Use > or stdout.
