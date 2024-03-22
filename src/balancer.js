fs = require('fs');

async function fetching() {
    const response = await fetch("https://app-api.dune.com/v1/graphql", {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-hasura-api-key": "",
            "cookie": "_ga=GA1.1.2093146878.1709278994; __stripe_mid=b334b7dc-53f9-4e00-9b15-21cb9c40852fc70bbc; hubspotutk=bd9d203429878d45c60ef417520b5488; __hssrc=1; __hstc=178244666.bd9d203429878d45c60ef417520b5488.1709376536732.1709376536732.1710052230246.2; AMP_MKTG_e76ce253e6=JTdCJTdE; __cf_bm=QSkOBWf5Jj8K3nN_CfnT4m3ga_orLJiWtB8zaKT55ME-1710058583-1.0.1.1-q.uDG7mA9RfmaJxqfL3mD_8ygnRVOy.dqzvWl2aItJrMjPzS9vfYwOmVSu0KNXxEYfNZi5FZNQEhfr6K7NA6QA; cf_clearance=RwZzxhpiKk4VQDAsK.1uR1x05fVd79XrDVJvTJwi440-1710058713-1.0.1.1-QA8id5P.ktjGQcep7rhSSYDLuieHqpjrcFGjxSBEWzP7Kme.5spAeykRuAg14EeeS.P6a9TKmLOYetSKitPAVQ; __stripe_sid=b86e7d11-b18c-436a-91d2-56d135433c538bbb38; _ga_H1G057R0KN=GS1.1.1710058711.15.1.1710058865.0.0.0; AMP_e76ce253e6=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJiYzViYmZkYy0yNzE3LTRkNjgtODgyYy1hODg0MmMzYmQzNWIlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjI2MDI2NDYlMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNzEwMDU1MzQyNjI0JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTcxMDA1ODg3MTk2MCUyQyUyMmxhc3RFdmVudElkJTIyJTNBNTYwJTdE",
            "Referer": "https://dune.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "{\"operationName\":\"GetExecution\",\"variables\":{\"execution_id\":\"01HRKQ8VX40APWT0V2SPZPC0VE\",\"query_id\":3508368,\"parameters\":[]},\"query\":\"query GetExecution($execution_id: String!, $query_id: Int!, $parameters: [Parameter!]!) {\\n  get_execution(\\n    execution_id: $execution_id\\n    query_id: $query_id\\n    parameters: $parameters\\n  ) {\\n    execution_queued {\\n      execution_id\\n      execution_user_id\\n      position\\n      execution_type\\n      created_at\\n      __typename\\n    }\\n    execution_running {\\n      execution_id\\n      execution_user_id\\n      execution_type\\n      started_at\\n      created_at\\n      __typename\\n    }\\n    execution_succeeded {\\n      execution_id\\n      runtime_seconds\\n      generated_at\\n      columns\\n      data\\n      max_result_size_reached_bytes\\n      request_max_result_size_bytes\\n      __typename\\n    }\\n    execution_failed {\\n      execution_id\\n      type\\n      message\\n      metadata {\\n        line\\n        column\\n        hint\\n        __typename\\n      }\\n      runtime_seconds\\n      generated_at\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\"}",
        "method": "POST"
    });

    const data = await response.json();
    console.log(data.data.get_execution.execution_succeeded.data);

    fs.writeFileSync('balancer_txns.json', JSON.stringify(data.data.get_execution.execution_succeeded.data));

}

fetching();
