import fs from 'fs';


async function readLoaning() {
    fs.readFile(`./arb_contracts/balancer_t`, 'utf8', async (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const loans = JSON.parse(data);
        const chunkSize = 20
        const chunks = [];
        for (let i = 0; i < loans.length; i += chunkSize) {
            chunks.push(loans.slice(i, i + chunkSize));
        }

        // Process each chunk in parallel
        await Promise.all(chunks.map(processChunk));
    })
}



async function processChunk(chunk: any, chunkIndex: any) {
    console.log(`Processing chunk ${chunkIndex + 1}/${chunk.length}`);
    for (const contract of chunk) {
        for (const contractName in contract) {
            let loans = contract[contractName];
            for (const loan of loans) {
                let start_time = new Date().getTime();
                try {
                    console.log(loan);

                }
                catch (error) {
                    console.error(error);
                    console.log(loan["txhash"]);
                }
            }
        }
    }
}

async function readLoaning2() {
    fs.readFile(`./arb_contracts/balancer_txns.json`, 'utf8', async (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const loans = JSON.parse(data);

        // Process each dictionary in loans as a separate chunk
        for (const loan of loans) {
            for (const contract in loan) {
                console.log(contract);

                const chunk = loan[contract];
                // await processChunk(chunk, loans.indexOf(loan));
            }
        }
    });
}


async function main() {
    await readLoaning2();
}

main();
