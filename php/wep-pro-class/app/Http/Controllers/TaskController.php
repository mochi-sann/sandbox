<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TaskController extends Controller
{
public function index() {
return view('tasks.index');

}
public function create(Request $request) {
$task = new Task();

$task -> fill([
'label' => $request->input('label')
]);
$task -> save();
return redirect('/tasks');

}
public function new() {
return view('tasks.new');

}
    //
}
