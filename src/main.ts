// For more information, see https://crawlee.dev/
import { CheerioCrawler, Dataset, LogLevel, log } from 'crawlee';

interface Traffic {
    trafficInfo: {label: string, value: string}[];
    trafficMap: string;
    coordinatesMap: [number | string, number | string]
}

interface Room {
    title: string;
    rent: string;
    size: string;
    slots: {rental: string; size: string; room: string; features: string[]}[]

}

interface Result {
    url: string;
    title: string;
    houseName: string;
    address: string;
    images: string[];
    traffic: Traffic;
    information: string[];
    publicServices: {label: string; value: string}[];
    schools: {label: string; value: string}[];
    rooms: Room[];
    telephone: string;
    crawledAt: string;
}

const startUrls = ['https://www.villagehouse.jp/vi/thue/hokkaido/hokkaido/sapporo-shi-011002/sakuradai-1063/', 'https://www.villagehouse.jp/vi/thue/hokkaido/hokkaido/sapporo-shi-011002/higashi-tsukisamu-1034/'];

// Crawlers come with various utilities, e.g. for logging.
// Here we use debug level of logging to improve the debugging experience.
// This functionality is optional!
log.setLevel(LogLevel.DEBUG);

const results: Result[] = [];

const crawler = new CheerioCrawler({
    // The crawler downloads and processes the web pages in parallel, with a concurrency
    // automatically managed based on the available system memory and CPU (see AutoscaledPool class).
    // Here we define some hard limits for the concurrency.
    minConcurrency: 10,
    maxConcurrency: 50,

    // This function will be called for each URL to crawl.
    // It accepts a single parameter, which is an object with options as:
    // https://crawlee.dev/api/cheerio-crawler/interface/CheerioCrawlerOptions#requestHandler
    // We use for demonstration only 2 of them:
    // - request: an instance of the Request class with information such as the URL that is being crawled and HTTP method
    // - $: the cheerio object containing parsed HTML
    async requestHandler({ request, $ }) {
        log.debug(`Processing ${request.url}...`);

        // Extract data from the page using cheerio.
        const title = $('title').text().trim();

        const houseName = $('h1.container-showcase-heading').text().trim();
        const address = $('.container-showcase-subheading .element-address').text().trim(); 
        const images = $(".container-gallery-data").map((_, elem1) => {
            return $(elem1).find('img').map((__, elem2) => $(elem2).attr('src')).get();
        }).get();
        


        // traffic
        const trafficInfo = $(".container-information-traffic-left li").map((_, elem) => {
            return {
                label: $(elem).find('.container-information-list-heading').text().trim(),
                value: $(elem).find('.container-information-list-annotation').text().trim()
            }
        }).get();
        const trafficMap = $(".container-information-traffic-right img").attr('src');
        const coordinatesMap = new URL(trafficMap!).searchParams.get("center")?.split(',');

        // house information 
        const houseInfoElem = $(".container-information-summary-item");
        const information = $(houseInfoElem[0]).find(".container-information-list li").map((index, elem) => $(elem).text().trim()).get()
        
        const publicServices = $(houseInfoElem[1]).find(".container-information-list li").map((index, elem) => {
            return {
                label: $(elem).find(".container-information-list-heading").text().trim(),
                value: $(elem).find(".container-information-list-annotation").map((index, elem) => $(elem).text().trim()).get().join(', ')
            }
        }).get();

        const schools = $(houseInfoElem[2]).find(".container-information-list li").map((index, elem) => {
            return {
                label: $(elem).find(".container-information-list-heading").text().trim(),
                value: $(elem).find(".container-information-list-annotation").map((index, elem) => $(elem).text().trim()).get().join(', ')
            }
        }).get();

        // rooms
        const rooms = $(".container-rooms-group-card").map((index, elem) => {
            // .match(/\d+/g)
            // const slot = $($(elem).find(".container-rooms-group-card-header-brief span")[0]).text().match(/\d+/g);

            return {
                // tên phòng
                title: $(elem).attr("data-name"),
                // diện tích
                size: `${$(elem).attr("data-size")}m²`,
                // giá
                rent: `¥${$(elem).attr("data-rent")}`,
                // phòng còn trống
                slots: $(elem).find(".container-rooms-group-card-list-item .container-rooms-group-card-list-item-info").map((index, elem) => {
                    const slotInfo = $(elem).find(".container-rooms-group-card-list-item-info-property");
                    
                    return {
                        // cho thuê
                        rental: $($(slotInfo).find("dl dd")[0]).text().trim(),

                        // diện tích
                        size: $($(slotInfo).find("dl dd")[1]).text().trim(),

                        // phòng
                        room: $($(slotInfo).find("dl dd")[2]).text().trim(),

                        // ngày xem phòng
                        time: $($(slotInfo).find("dl dd")[3]).text().trim(),

                        features: $(elem).find(".container-rooms-group-card-list-item-info-feature dl").map((index, elem) => $(elem).text().trim()).get()
                    }
                }).get()
                // detail: 


            }
        }).get() as Room[];

        const telephone = $(".container-contact-bottom-telephone .container-contact-bottom-telephone-number").text();

        const result = {
            url: request.url,
            title,
            houseName,
            address,
            images,
            traffic: {
                trafficInfo,
                trafficMap,
                coordinatesMap
            },
            information,
            publicServices,
            schools,
            rooms,
            telephone,
            crawledAt: new Date().toISOString()
        } as Result;


        results.push(result);

        // console.log(results);
        // Store the results to the dataset. In local configuration,
        // the data will be stored as JSON files in ./storage/datasets/default
        await Dataset.pushData(result);
    },

    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 20,
   
    // On error, retry each page at most once.
    maxRequestRetries: 1,

    // Increase the timeout for processing of each page.
    requestHandlerTimeoutSecs: 30,

     // This function is called if the page processing failed more than maxRequestRetries + 1 times.
    failedRequestHandler({ request }) {
        log.debug(`Request ${request.url} failed twice.`);
    },
    
});

await crawler.run(startUrls);
log.debug('Crawler finished.');

// do something with the results
// console.log(results)


