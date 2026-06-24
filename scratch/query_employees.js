async function run() {
  try {
    const res = await fetch('https://my-digichecklist-default-rtdb.firebaseio.com/employees.json');
    const data = await res.json();
    const employees = Object.values(data).filter(Boolean);
    
    console.log('Search for Amit Kumar:');
    console.log(employees.filter(e => e.Employee_Name === 'Amit Kumar' || e.Employee_ID === 'DN0301'));

    console.log('\nSearch for Amanpreet Singh:');
    console.log(employees.filter(e => e.Employee_Name === 'Amanpreet Singh' || e.Employee_ID === 'DN0296'));

    console.log('\nSearch for DN0295:');
    console.log(employees.filter(e => e.Employee_ID === 'DN0295'));

  } catch (err) {
    console.error(err);
  }
}
run();
