async function run() {
  try {
    const res = await fetch('https://my-digichecklist-default-rtdb.firebaseio.com/employees.json');
    const data = await res.json();
    const employees = Object.values(data).filter(Boolean);
    
    console.log('First 10 employees:');
    for (let i = 0; i < Math.min(10, employees.length); i++) {
      console.log(`${i}: ${employees[i].Employee_Name} (${employees[i].Employee_ID}) - ${employees[i].Designation}`);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
