const cpr = require('cpr');

function copySource(from, to) {
  return new Promise((resolve, reject) => {
    const options = {
      deleteFirst: true,
    };
    cpr(from, to, options, (err, files) => {
      if(err) {
        reject(err);
      } else {
        resolve(files);
      }
    })
  });
}

module.exports = async function(arc, cfn, stage) {
  if (!arc.static) {
    console.log('Needs arc.static to be defined');
    return;
  }

  // Copy modules
  await copySource('./src/views', './node_modules/arc-progressive-bundle/src/views');

  // Add lambda for bundling
  cfn.Resources.GetModulesCatchall = {
    Type: 'AWS::Serverless::Function',
    Properties: {
      Handler: 'index.handler',
      CodeUri: './node_modules/arc-progressive-bundle/src/http/get-_modules-catchall/node_modules/@architect/views',
      Runtime: 'nodejs12.x',
      MemorySize: 1152,
      Timeout: 15,
      Environment: {
        Variables: {
          ARC_ROLE: {
            Ref: 'Role',
          },
          ARC_CLOUDFORMATION: {
            Ref: 'AWS::StackName',
          },
          ARC_APP_NAME: arc.app[0],
          ARC_HTTP: 'aws_proxy',
          NODE_ENV: stage,
          ARC_STATIC_BUCKET: {
            Ref: 'StaticBucket',
          },
        },
      },
      Role: {
        'Fn::Sub': [
          'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
          {
            roleName: {
              Ref: 'Role',
            },
          },
        ],
      },
      Events: {
        GetModulesCatchallEvent: {
          Type: 'HttpApi',
          Properties: {
            Path: '/_modules/{proxy+}',
            Method: 'GET',
            ApiId: {
              Ref: 'HTTP',
            },
          },
        },
      },
    },
  };

  // Add DynamoDB table for caching filenames
  cfn.Resources.PBCacheTable = {
    Type: 'AWS::DynamoDB::Table',
    Properties: {
      KeySchema: [
        {
          AttributeName: 'key',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'key',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    },
  };

  // Add policy for access to PBCache table
  cfn.Resources.Role.Properties.Policies.push({
    "PolicyName": "ArcPBCacheDynamoPolicy",
    "PolicyDocument": {
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "dynamodb:BatchGetItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:DeleteItem",
            "dynamodb:GetItem",
            "dynamodb:Query",
            "dynamodb:Scan",
            "dynamodb:UpdateItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:DescribeStream",
            "dynamodb:ListStreams"
          ],
          "Resource": [
            {
              "Fn::Sub": [
                "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}",
                {
                  "tablename": {
                    "Ref": "PBCacheTable"
                  }
                }
              ]
            },
            {
              "Fn::Sub": [
                "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}/*",
                {
                  "tablename": {
                    "Ref": "PBCacheTable"
                  }
                }
              ]
            },
            {
              "Fn::Sub": [
                "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}/stream/*",
                {
                  "tablename": {
                    "Ref": "PBCacheTable"
                  }
                }
              ]
            }

          ]
        }
      ]
    }
  });

  // Add table name to SSM
  cfn.Resources.PbCacheParam = {
    Type: 'AWS::SSM::Parameter',
    Properties: {
      Type: 'String',
      Name: {
        'Fn::Sub': [
          '/${AWS::StackName}/tables/${tablename}',
          {
            tablename: 'pb-cache',
          },
        ],
      },
      Value: {
        Ref: 'PBCacheTable',
      },
    },
  };

  return cfn;
}
