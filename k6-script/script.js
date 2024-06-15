import exec from 'k6/execution';
import http from 'k6/http'
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '5m', target: 60 }, // simulate ramp-up of traffic from 1 to 60 users over 5 minutes.
        { duration: '10m', target: 60 }, // stay at 60 users for 10 minutes
        { duration: '3m', target: 100 }, // ramp-up to 100 users over 3 minutes (peak hour starts)
        { duration: '2m', target: 100 }, // stay at 100 users for short amount of time (peak hour)
        { duration: '3m', target: 60 }, // ramp-down to 60 users over 3 minutes (peak hour ends)
        { duration: '10m', target: 60 }, // continue at 60 for additional 10 minutes
        { duration: '5m', target: 0 }, // ramp-down to 0 users
    ],
};

export default function () {
    const host = __ENV.host
    const payload = JSON.stringify({
        username: __ENV.user,
        password: __ENV.password,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const card = `${host}/api/card`
    const autocomplete = `${host}/api/database/2/autocomplete_suggestions?substring=`
    const automagic_url = `${host}/api/automagic-dashboards/table`
    const dataset = `${host}/api/dataset`

    // GUI questions
    // let orders_and_people_payload = {"name":"Orders + people","dataset_query":{"database":2,"query":{"source-table":5,"joins":[{"fields":"all","source-table":9,"condition":["=",["field",79,null],["field",85,{"join-alias":"People - User"}]],"alias":"People - User"}]},"type":"query"},"display":"table","description":null,"visualization_settings":{},"collection_id":null,"result_metadata":null}
    // let orders_and_people_payload = {"name":`Orders_people_model_${exec.vu.idInTest}`,"dataset_query":{"database":2,"query":{"source-table":9,"joins":[{"fields":"all","source-table":13,"condition":["=",["field",112,null],["field",120,{"join-alias":"People - User"}]],"alias":"People - User"}]},"type":"query"},"display":"table","description":null,"visualization_settings":{},"collection_id":null,"collection_position":null,"result_metadata":null}
    // let sum_of_orders_scalar = {"name":`Orders_people_model, Sum of Total - ${exec.vu.idInTest}`,"dataset_query":{"database":2,"type":"query","query":{"aggregation":[["sum",["field","total",{"base-type":"type/Float"}]]],"source-table":"card__1"}},"display":"scalar","description":null,"visualization_settings":{"column_settings":{"[\"name\",\"sum\"]":{"number_separators":".,","decimals":0,"prefix":"$"}}},"collection_id":null,"collection_position":null,"result_metadata":[{"display_name":"Sum of Total","semantic_type":null,"settings":null,"field_ref":["aggregation",0],"name":"sum","base_type":"type/Float","effective_type":"type/Float","fingerprint":{"global":{"distinct-count":1,"nil%":0},"type":{"type/Number":{"min":1595328.1251600615,"q1":1595328.1251600615,"q3":1595328.1251600615,"max":1595328.1251600615,"sd":null,"avg":1595328.1251600615}}}}]}
    // let orders_pivot = {"name":`Orders_people_model, Sum of Total and Sum of Tax, Grouped by People - User → Source and People - User → State - ${exec.vu.idInTest}`,"dataset_query":{"database":2,"type":"query","query":{"aggregation":[["sum",["field","total",{"base-type":"type/Float"}]],["sum",["field","tax",{"base-type":"type/Float"}]]],"breakout":[["field","source",{"base-type":"type/Text"}],["field","state",{"base-type":"type/Text"}]],"source-table":"card__1"}},"display":"pivot","description":null,"visualization_settings":{"pivot_table.column_split":{"rows":[["field",118,null]],"columns":[["field",127,null]],"values":[["aggregation",0],["aggregation",1]]}},"collection_id":null,"collection_position":null,"result_metadata":[{"description":"The channel through which we acquired this user. Valid values include: Affiliate, Facebook, Google, Organic and Twitter","semantic_type":null,"coercion_strategy":null,"name":"pivot-grouping","settings":null,"field_ref":["expression","pivot-grouping"],"effective_type":"type/Text","id":127,"visibility_type":"normal","display_name":"pivot-grouping","fingerprint":{"global":{"distinct-count":1,"nil%":0},"type":{"type/Number":{"min":3,"q1":3,"q3":3,"max":3,"sd":null,"avg":3}}},"base_type":"type/Integer"},{"description":"The state or province of the account’s billing address","semantic_type":null,"coercion_strategy":null,"name":"sum","settings":null,"field_ref":["aggregation",0],"effective_type":"type/Text","id":118,"visibility_type":"normal","display_name":"Sum of Total","fingerprint":{"global":{"distinct-count":1,"nil%":0},"type":{"type/Number":{"min":1595328.1251600615,"q1":1595328.1251600615,"q3":1595328.1251600615,"max":1595328.1251600615,"sd":null,"avg":1595328.1251600615}}},"base_type":"type/Float"},{"display_name":"Sum of Tax","field_ref":["aggregation",1],"name":"sum_2","base_type":"type/Float","effective_type":"type/Integer","semantic_type":null,"fingerprint":{"global":{"distinct-count":1,"nil%":0},"type":{"type/Number":{"min":72388.33999999962,"q1":72388.33999999962,"q3":72388.33999999962,"max":72388.33999999962,"sd":null,"avg":72388.33999999962}}}}]}
    // let average_quantity_per_source_bar = {"name":`Orders_people_model, Average of Quantity, Grouped by People - User → Source - ${exec.vu.idInTest}`,"dataset_query":{"database":2,"type":"query","query":{"aggregation":[["avg",["field","quantity",{"base-type":"type/Integer"}]]],"breakout":[["field","source",{"base-type":"type/Text"}]],"source-table":"card__1"}},"display":"bar","description":null,"visualization_settings":{"graph.dimensions":["source"],"graph.metrics":["avg"]},"collection_id":null,"collection_position":null,"result_metadata":[{"description":"The channel through which we acquired this user. Valid values include: Affiliate, Facebook, Google, Organic and Twitter","semantic_type":"type/Source","coercion_strategy":null,"name":"source","settings":null,"field_ref":["field",127,null],"effective_type":"type/Text","id":127,"visibility_type":"normal","display_name":"People - User → Source","fingerprint":{"global":{"distinct-count":5,"nil%":0},"type":{"type/Text":{"percent-json":0,"percent-url":0,"percent-email":0,"percent-state":0,"average-length":7.4084}}},"base_type":"type/Text"},{"display_name":"Average of Quantity","semantic_type":"type/Quantity","settings":null,"field_ref":["aggregation",0],"name":"avg","base_type":"type/Decimal","effective_type":"type/Decimal","fingerprint":{"global":{"distinct-count":5,"nil%":0},"type":{"type/Number":{"min":3.6510496671786994,"q1":3.659637416794675,"q3":3.7481914456347347,"max":3.7714586624539232,"sd":0.05094765303627213,"avg":3.706552221899672}}}}]}
    // let sum_tax_per_source_pie = {"name":`Orders_people_model, Sum of Tax, Grouped by People - User → Source - ${exec.vu.idInTest}`,"dataset_query":{"database":2,"type":"query","query":{"aggregation":[["sum",["field","tax",{"base-type":"type/Float"}]]],"breakout":[["field","source",{"base-type":"type/Text"}]],"source-table":"card__1"}},"display":"pie","description":null,"visualization_settings":{},"collection_id":null,"collection_position":null,"result_metadata":[{"description":"The channel through which we acquired this user. Valid values include: Affiliate, Facebook, Google, Organic and Twitter","semantic_type":"type/Source","coercion_strategy":null,"name":"source","settings":null,"field_ref":["field",127,null],"effective_type":"type/Text","id":127,"visibility_type":"normal","display_name":"People - User → Source","fingerprint":{"global":{"distinct-count":5,"nil%":0},"type":{"type/Text":{"percent-json":0,"percent-url":0,"percent-email":0,"percent-state":0,"average-length":7.4084}}},"base_type":"type/Text"},{"display_name":"Sum of Tax","semantic_type":null,"settings":null,"field_ref":["aggregation",0],"name":"sum","base_type":"type/Float","effective_type":"type/Float","fingerprint":{"global":{"distinct-count":5,"nil%":0},"type":{"type/Number":{"min":13231.73,"q1":14175.155000000024,"q3":14887.395000000013,"max":15293.100000000048,"sd":760.5147553927015,"avg":14477.66800000002}}}}]}
        
    // SQL question
    let sql_card_payload = {"name": `some sql question - ${exec.vu.idInTest}`,"dataset_query":{"type":"native","native":{"query":"select * from people","template-tags":{}},"database":2},"display":"table","description":null,"visualization_settings":{},"parameters":[],"collection_id":null,"result_metadata":null}
    
    function logger (request_object) {
        console.log (`${request_object.request.method} ${request_object.request.url} ${request_object.status} took ${request_object.timings.duration} ms total`)
    }

    function checker(request_object) {
        if (
            !check(request_object, {
              'status code MUST be 200': (res) => res.status == 200 || res.status == 204 || res.status == 202,
            })
        ) {
            console.error(`${request_object.request.method} ${request_object.request.url} ${request_object.status} ${request_object.status_text}`)
            exec.test.abort('status code was *not* 200, 202 or 204');
        }
    }

    // Auth
    const res = http.post(`${host}/api/session`, payload, params)
    const token = res.cookies["metabase.SESSION"][0].value
    const jar = http.cookieJar();
    jar.set(`${host}`, 'metabase.SESSION', token)
    sleep(1);

    http.get(`${host}/api/user/current`)
    http.get(`${host}/api/session/properties`)

    // Simulate GUI queries
    let first_card = http.post(card, JSON.stringify(orders_and_people_payload), params)
    checker(first_card)
    logger(first_card)
    sleep(1);

    http.get(`${host}/api/user/current`)
    http.get(`${host}/api/session/properties`)
    let second_card = http.post(card, JSON.stringify(sum_of_orders_scalar), params)
    checker(second_card)
    logger(second_card)
    sleep(1);
    let delete_second_card = http.del(`${card}/${second_card.json().id}`)
    checker(delete_second_card)
    sleep(1);

    http.get(`${host}/api/user/current`)
    http.get(`${host}/api/session/properties`)
    let third_card = http.post(card, JSON.stringify(orders_pivot), params)
    checker(third_card)
    logger(third_card)
    sleep(1);
    let delete_third_card = http.del(`${card}/${third_card.json().id}`)
    checker(delete_third_card)
    sleep(1);

    http.get(`${host}/api/user/current`)
    http.get(`${host}/api/session/properties`)
    let fourth_card = http.post(card, JSON.stringify(average_quantity_per_source_bar), params)
    checker(fourth_card)
    logger(fourth_card)
    sleep(1);
    let delete_fourth_card = http.del(`${card}/${fourth_card.json().id}`)
    checker(delete_fourth_card)
    sleep(1);

    http.get(`${host}/api/user/current`)
    http.get(`${host}/api/session/properties`)
    let fifth_card = http.post(card, JSON.stringify(sum_tax_per_source_pie), params)
    checker(fifth_card)
    logger(fifth_card)
    sleep(1);
    let delete_fifth_card = http.del(`${card}/${fifth_card.json().id}`)
    checker(delete_fifth_card)
    sleep(1);
    
    http.get(`${host}/api/user/current`)
    http.get(`${host}/api/session/properties`)
    // Simulate autocomplete
    let autoc_1 = http.get(autocomplete + 'p')
    checker(autoc_1)
    console.log(`Autocomplete p responded ${autoc_1.status}`)
    sleep(0.2);
    let autoc_2 = http.get(autocomplete + 'pe')
    checker(autoc_2)
    console.log(`Autocomplete p responded ${autoc_2.status}`)
    sleep(0.2);
    let autoc_3 = http.get(autocomplete + 'peo')
    checker(autoc_3)
    console.log(`Autocomplete p responded ${autoc_3.status}`)
    sleep(0.2);
    let autoc_4 = http.get(autocomplete + 'peop')
    checker(autoc_4)
    console.log(`Autocomplete p responded ${autoc_4.status}`)
    sleep(0.2);
    let autoc_5 = http.get(autocomplete + 'peopl')
    checker(autoc_5)
    console.log(`Autocomplete p responded ${autoc_5.status}`)
    sleep(0.2);
    let autoc_6 = http.get(autocomplete + 'people')
    checker(autoc_6)
    console.log(`Autocomplete p responded ${autoc_6.status}`)
    sleep(0.2);

    // Simulate SQL question
    let sixth_sql_card = http.post(card, JSON.stringify(sql_card_payload), params)
    checker(sixth_sql_card)
    logger(sixth_sql_card)
    sleep(1);
    let delete_sixth_sql_card = http.del(`${card}/${sixth_sql_card.json().id}`)
    checker(delete_sixth_sql_card)
    sleep(1);
    
    // X-rays and browse data
    let tables = http.get(`${host}/api/database/2/schema/public?include_hidden=true`)
    tables = tables.json().map(table => table.id)

    tables.map(table => {
        http.get(`${host}/api/user/current`)
        http.get(`${host}/api/session/properties`)
        let xRayCall = http.get(`${automagic_url}/${table}?`)
        checker(xRayCall)
        console.log(`X-Ray responded ${xRayCall.status}`)
        sleep(0.2)
        let datasetCall = http.post(dataset, JSON.stringify({"database":2,"query":{"source-table":table},"type":"query","parameters":[]}), params)
        checker(datasetCall)
        console.log(`Table responded with ${datasetCall.status}`)
    })

    http.del(`${host}/api/session`)
    sleep(2);
}