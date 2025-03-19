import whois from 'whois';


export async function getWhoisData(url) {
    try {
        const domain = new URL(url).hostname;

        const data = await new Promise((resolve, reject) => {
            whois.lookup(domain, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        //Get IP Adresses from domain name using Google DNS
        let ips = [];
        try {
            const response = await fetch(
                `https://dns.google/resolve?name=${domain}`
            );
            const json = await response.json();
            ips = json.Answer?.map((entry) => entry.data) || [];
        } catch (error) {
            console.error(`Failed to fetch IPs for ${domain}:`, error);
        }
        return { whoisData: data, ips };
    } catch (error) {
        console.error(`Error fetching WHOIS data for ${url}:`, error);
        throw error;
    }
}

export async function parseWhoisData(whoisData, ips, urls) {
    if (!whoisData) {
        throw new Error("WHOIS data is undefined");
    }

    const fields = {
        urls: urls,
        name: whoisData.match(/Domain Name: (.+)/i)?.[1]?.trim(),
        nameServers: whoisData
            .match(/Name Server: (.+)/gi)
            ?.map((ns) => ns.replace("Name Server:", "").trim()),
        registrar: whoisData.match(/Registrar: (.+)/i)?.[1]?.trim(),
        creationDate: whoisData
            .match(/(Creation Date|Registered On): (.+)/i)?.[2]
            ?.trim(),
        IPAddress: ips,
        updatedDate: whoisData
            .match(/(Updated Date|Last Updated On): (.+)/i)?.[2]
            ?.trim(),
    };

    return fields;
}
