async function run() {
  try {
    const res = await fetch('https://my-digichecklist-default-rtdb.firebaseio.com/employees.json');
    const data = await res.json();
    const employees = Object.values(data).filter(Boolean);
    
    const missingName = employees.filter(e => !e.Employee_Name);
    const missingId = employees.filter(e => !e.Employee_ID);
    
    console.log('Employees with missing Name:', missingName.length);
    console.log('Employees with missing ID:', missingId.length);
    if (missingName.length > 0 || missingId.length > 0) {
      console.log('Sample missing name:', missingName.slice(0, 3));
      console.log('Sample missing id:', missingId.slice(0, 3));
    }
  } catch (err) {
    console.error(err);
  }
}
run();
