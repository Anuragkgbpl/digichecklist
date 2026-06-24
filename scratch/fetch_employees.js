async function run() {
  try {
    const res = await fetch('https://my-digichecklist-default-rtdb.firebaseio.com/employees.json');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
