# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import logging
import traceback
import boto3
import json
import time

athena = boto3.client('athena')
sesv2 = boto3.client('sesv2')

queries_executed = []


def execute_named_queries(namedQueries):
    print("Named Queries: " + str(namedQueries))

    try:
        response = athena.batch_get_named_query(
            NamedQueryIds=namedQueries
        )

        response['NamedQueries'] = sorted(response['NamedQueries'], key=lambda d: d['Name']) 

        for q in response['NamedQueries']:
            start_query_response = athena.start_query_execution(
                QueryString=q['QueryString'],
                QueryExecutionContext={
                'Database': q['Database']
                },
                ResultConfiguration={
                'OutputLocation': 's3://%s/temp/' % (os.environ.get('S3_DATA_BUCKET'))
                }
            )
            queries_executed.append(start_query_response['QueryExecutionId'])

    except Exception as error:
        logging.error('execute_named_queries error: %s' % (error))
        logging.error('execute_named_queries trace: %s' % traceback.format_exc())
        raise

def lambda_handler(event, context):

    log_level = str(os.environ.get('LOG_LEVEL')).upper()
    if log_level not in [
                    'DEBUG', 'INFO',
                    'WARNING', 'ERROR',
                    'CRITICAL'
                ]:
        log_level = 'DEBUG'

    logging.getLogger().setLevel(log_level)
    bucketname = os.environ.get('S3_DATA_BUCKET')
    logging.info('S3_DATA_BUCKET ENV variable :----  %s' % bucketname)
    try:
        execute_named_queries([
            os.environ.get('EMAIL_ALL_EVENTS'),
            os.environ.get('JOURNEY_ALL_EVENTS'),
            os.environ.get('SMS_ALL_EVENTS'),
            os.environ.get('CAMPAIGN_ALL_EVENTS'),
            os.environ.get('CUSTOM_ALL_EVENTS'),
            os.environ.get('ALL_SEND_EVENTS'),
        ])

        #Dependent on views just created
        execute_named_queries([
            os.environ.get('ALL_SEND_EVENT_PINPOINT'),
            os.environ.get('EMAIL_ALL_EVENTS_PINPOINT'),
            os.environ.get('SMS_ALL_EVENTS_PINPOINT'),
        ])

        time.sleep(4)
        for query_executed in queries_executed: 
            get_query_response = athena.get_query_execution(
                    QueryExecutionId=query_executed
            )

            if get_query_response['QueryExecution']['Status']['State'] == 'SUCCEEDED' or get_query_response['QueryExecution']['Status']['State'] == 'FAILED':
                logging.info('Query Result : %s' % (q['Name']), get_query_response)
                break


    except Exception as error:
        logging.error('lambda_handler error: %s' % (error))
        logging.error('lambda_handler trace: %s' % traceback.format_exc())
    