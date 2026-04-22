import fs from 'fs';

const severities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

function generateDummyData(count = 10) {
    const data = [];
    for (let i = 1; i <= count; i++) {
        data.push({
            ItemID: `ITEM-${1000 + i}`,
            ItemName: `Server Issue ${i} concerning database lag`,
            Category: 'Infrastructure',
            Severity: severities[Math.floor(Math.random() * severities.length)],
            Priority: `P${Math.floor(Math.random() * 4) + 1}`,
            Source: 'Monitoring Tool',
            Action: 'Investigate',
            Status: statuses[Math.floor(Math.random() * statuses.length)],
            Client: `Client-${String.fromCharCode(65 + (i % 5))}`,
            Project: `Migration Phase ${i % 3}`,
            Reporter: `Admin ${i}`,
            Assignee: `Engineer ${i % 4}`,
            Note: `Customer reported slow response times on endpoint ${i}.`,
            Tags: ['latency', 'database', `node-${i}`],
            ItemOriginUrl: `https://domain.com/${i}`,
            ItemDetail01: `Detailed log trace showing connection timeouts at ${new Date().toISOString()}`,
            ItemDetail02: `{"errorCode": "ETIMEDOUT", "retryCount": ${i % 3}}`,
            Score: parseFloat((Math.random() * 100).toFixed(2)),
            CreatedTimestamp: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
            UpdatedTimestamp: new Date().toISOString()
        });
    }
    fs.writeFileSync('./data/data.json', JSON.stringify(data, null, 2));
    console.log(`Generated ${count} records in data.json`);
}

generateDummyData(50);