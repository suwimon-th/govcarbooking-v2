async function run() {
    const res = await fetch("https://govcarbooking-v2.vercel.app/api/admin/resequence-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": "govcar_session=MOCK" },
        body: JSON.stringify({})
    });
    const text = await res.text();
    console.log(res.status, text);
}
run();
